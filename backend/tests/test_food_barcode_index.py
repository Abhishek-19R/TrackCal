import pytest
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.core.database import ensure_indexes
from app.models.food import Food, FoodProvenance, NutrientsPer100g, ServingSize
from app.repositories.food_repository import FoodRepository
from app.schemas.food import FoodCreate, FoodUpdate
from app.services.seed_service import seed_starter_foods
from tests.mock_db import AsyncMockDatabase


def make_test_food(name: str, barcode: str | None = None, is_system: bool = False, created_by: ObjectId | None = None) -> Food:
    user_id = created_by if not is_system else None
    return Food(
        name=name,
        barcode=barcode,
        is_system=is_system,
        created_by=user_id,
        provenance=FoodProvenance(
            source_type="system" if is_system else "user",
            source_name="starter_pack" if is_system else "custom",
        ),
        serving_sizes=[ServingSize(description="100g", weight_g=100.0, is_default=True)],
        nutrients_per_100g=NutrientsPer100g(calories=100.0, protein_g=5.0, carbs_g=15.0, fat_g=2.0),
        tags=["test"],
    )


def test_food_model_normalizes_empty_and_whitespace_barcode():
    """Verify Food model converts empty string and whitespace barcodes to None."""
    food_empty = make_test_food(name="Food Empty Barcode", barcode="", is_system=True)
    assert food_empty.barcode is None

    food_spaces = make_test_food(name="Food Spaces Barcode", barcode="   \t  ", is_system=True)
    assert food_spaces.barcode is None

    food_trimmed = make_test_food(name="Food Trimmed Barcode", barcode="  012345678905  ", is_system=True)
    assert food_trimmed.barcode == "012345678905"


def test_food_schemas_normalize_empty_and_whitespace_barcode():
    """Verify FoodCreate and FoodUpdate schemas normalize empty barcodes to None."""
    create_empty = FoodCreate(
        name="Item",
        barcode="",
        nutrients_per_100g=NutrientsPer100g(calories=50.0, protein_g=1.0, carbs_g=10.0, fat_g=0.5),
    )
    assert create_empty.barcode is None

    update_spaces = FoodUpdate(barcode="    ")
    assert update_spaces.barcode is None


@pytest.mark.asyncio
async def test_multiple_foods_without_barcodes_allowed(mock_db: AsyncMockDatabase):
    """
    Regression Test: Multiple foods with barcode=None or omitted barcode must NOT
    conflict under the partial unique index.
    """
    await ensure_indexes(mock_db)
    repo = FoodRepository(mock_db)
    user_id = ObjectId()

    # Create 3 foods without barcodes
    food1 = await repo.create(make_test_food(name="Brown Rice", barcode=None, created_by=user_id))
    food2 = await repo.create(make_test_food(name="Spinach", barcode=None, created_by=user_id))
    food3 = await repo.create(make_test_food(name="Tofu", barcode=None, created_by=user_id))

    assert food1.id is not None
    assert food2.id is not None
    assert food3.id is not None

    count = await mock_db.foods.count_documents({})
    assert count == 3


@pytest.mark.asyncio
async def test_duplicate_real_barcodes_rejected(mock_db: AsyncMockDatabase):
    """
    Regression Test: Real string barcodes must strictly enforce uniqueness.
    Inserting a second food with the same barcode must raise DuplicateKeyError.
    """
    await ensure_indexes(mock_db)
    repo = FoodRepository(mock_db)
    user_id = ObjectId()

    # First food with barcode succeeds
    await repo.create(make_test_food(name="Greek Yogurt", barcode="011110002222", created_by=user_id))

    # Second food with different barcode succeeds
    await repo.create(make_test_food(name="Almond Milk", barcode="033330004444", created_by=user_id))

    # Third food with duplicated barcode fails
    duplicate_food = make_test_food(name="Greek Yogurt Duplicate", barcode="011110002222", created_by=user_id)
    with pytest.raises(DuplicateKeyError) as exc_info:
        await repo.create(duplicate_food)

    assert "idx_foods_barcode_unique" in str(exc_info.value)
    assert "011110002222" in str(exc_info.value)


@pytest.mark.asyncio
async def test_ensure_indexes_migrates_legacy_sparse_index(mock_db: AsyncMockDatabase):
    """
    Regression Test: ensure_indexes detects and drops legacy idx_foods_barcode_sparse
    and establishes idx_foods_barcode_unique with partialFilterExpression.
    """
    from pymongo import ASCENDING, IndexModel

    # Simulate existing database with legacy sparse index
    legacy_idx = IndexModel([("barcode", ASCENDING)], unique=True, sparse=True, name="idx_foods_barcode_sparse")
    await mock_db.foods.create_indexes([legacy_idx])

    info_before = await mock_db.foods.index_information()
    assert "idx_foods_barcode_sparse" in info_before
    assert "idx_foods_barcode_unique" not in info_before

    # Run ensure_indexes
    await ensure_indexes(mock_db)

    info_after = await mock_db.foods.index_information()
    assert "idx_foods_barcode_sparse" not in info_after
    assert "idx_foods_barcode_unique" in info_after
    unique_idx = info_after["idx_foods_barcode_unique"]
    assert unique_idx.get("unique") is True
    assert "partialFilterExpression" in unique_idx
    assert unique_idx["partialFilterExpression"].get("barcode", {}).get("$type") == "string"


@pytest.mark.asyncio
async def test_repeated_seed_starter_foods_idempotency_with_mock_db(mock_db: AsyncMockDatabase):
    """
    Regression Test: Running seed_starter_foods multiple times preserves existing records,
    creates zero duplicates, and handles foods with and without barcodes without index errors.
    """
    await ensure_indexes(mock_db)

    # First seed run
    summary1 = await seed_starter_foods(db=mock_db)
    assert summary1["total_processed"] >= 15
    assert summary1["created"] == summary1["total_processed"]
    assert summary1["updated"] == 0

    count1 = await mock_db.foods.count_documents({"is_system": True})
    assert count1 == summary1["total_processed"]

    # Second seed run (immediate repeat)
    summary2 = await seed_starter_foods(db=mock_db)
    assert summary2["total_processed"] == summary1["total_processed"]
    assert summary2["created"] == 0
    assert summary2["updated"] == summary1["total_processed"]

    count2 = await mock_db.foods.count_documents({"is_system": True})
    assert count2 == count1
