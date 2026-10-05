import pytest
from bson import ObjectId

from app.models.food import Food, FoodProvenance, NutrientsPer100g, ServingSize
from app.repositories.food_repository import FoodRepository
from tests.mock_db import AsyncMockDatabase


def make_sample_food(
    name: str = "Test Food",
    is_system: bool = False,
    created_by: ObjectId = None,
    source_type: str = "user",
    brand: str = None,
    tags: list = None,
) -> Food:
    return Food(
        name=name,
        brand=brand,
        is_system=is_system,
        created_by=created_by,
        provenance=FoodProvenance(source_type=source_type, source_name="test"),
        serving_sizes=[ServingSize(description="100g", weight_g=100.0, is_default=True)],
        nutrients_per_100g=NutrientsPer100g(calories=100.0, protein_g=10.0, carbs_g=10.0, fat_g=2.0),
        tags=tags or ["test"],
    )


@pytest.mark.asyncio
async def test_repository_create_and_get(mock_db: AsyncMockDatabase):
    repo = FoodRepository(mock_db)
    user_id = ObjectId()
    food = make_sample_food(name="Apple", created_by=user_id)

    created = await repo.create(food)
    assert created.id is not None
    assert isinstance(created.id, ObjectId)

    retrieved = await repo.get_by_id(created.id)
    assert retrieved is not None
    assert retrieved.name == "Apple"
    assert retrieved.created_by == user_id


@pytest.mark.asyncio
async def test_repository_update_and_delete(mock_db: AsyncMockDatabase):
    repo = FoodRepository(mock_db)
    user_id = ObjectId()
    food = await repo.create(make_sample_food(name="Banana", created_by=user_id))

    updated = await repo.update(food.id, {"name": "Ripe Banana", "nutrients_per_100g.calories": 105.0})
    assert updated is not None
    assert updated.name == "Ripe Banana"
    assert updated.nutrients_per_100g.calories == 105.0

    deleted = await repo.delete(food.id)
    assert deleted is True

    retrieved_after_delete = await repo.get_by_id(food.id)
    assert retrieved_after_delete is None


@pytest.mark.asyncio
async def test_repository_search_scoping_and_cross_user_isolation(mock_db: AsyncMockDatabase):
    repo = FoodRepository(mock_db)
    user1_id = ObjectId()
    user2_id = ObjectId()

    # System food
    await repo.create(make_sample_food(name="System Oats", is_system=True, source_type="system"))

    # Cached food
    await repo.create(make_sample_food(name="Cached Tuna", is_system=False, source_type="cached"))

    # User 1 custom food
    await repo.create(make_sample_food(name="User 1 Special Smoothie", is_system=False, created_by=user1_id, source_type="user"))

    # User 2 custom food
    await repo.create(make_sample_food(name="User 2 Secret Recipe", is_system=False, created_by=user2_id, source_type="user"))

    # 1. Search as User 1: should see System Oats, Cached Tuna, and User 1 Smoothie. NEVER User 2 Secret Recipe.
    user1_items, user1_total = await repo.search(query=None, current_user_id=user1_id)
    user1_names = [f.name for f in user1_items]
    assert user1_total == 3
    assert "System Oats" in user1_names
    assert "Cached Tuna" in user1_names
    assert "User 1 Special Smoothie" in user1_names
    assert "User 2 Secret Recipe" not in user1_names

    # 2. Search as User 2: should see System Oats, Cached Tuna, and User 2 Secret Recipe. NEVER User 1 Smoothie.
    user2_items, user2_total = await repo.search(query=None, current_user_id=user2_id)
    user2_names = [f.name for f in user2_items]
    assert user2_total == 3
    assert "System Oats" in user2_names
    assert "Cached Tuna" in user2_names
    assert "User 2 Secret Recipe" in user2_names
    assert "User 1 Special Smoothie" not in user2_names


@pytest.mark.asyncio
async def test_repository_search_query_and_pagination(mock_db: AsyncMockDatabase):
    repo = FoodRepository(mock_db)

    for i in range(12):
        await repo.create(
            make_sample_food(
                name=f"Berry Mix #{i:02d}",
                is_system=True,
                source_type="system",
                tags=["berry", "fruit"],
            )
        )

    # Empty search: returns all 12 items paginated
    page1_items, total = await repo.search(query="", current_user_id=None, page=1, limit=5)
    assert total == 12
    assert len(page1_items) == 5
    assert page1_items[0].name == "Berry Mix #00"

    page2_items, _ = await repo.search(query="", current_user_id=None, page=2, limit=5)
    assert len(page2_items) == 5
    assert page2_items[0].name == "Berry Mix #05"

    page3_items, _ = await repo.search(query="", current_user_id=None, page=3, limit=5)
    assert len(page3_items) == 2

    # Query search: keyword filter
    query_items, q_total = await repo.search(query="Berry Mix #07", current_user_id=None)
    assert q_total == 1
    assert query_items[0].name == "Berry Mix #07"
