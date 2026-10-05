import json
from pathlib import Path
import pytest
from bson import ObjectId

from app.models.food import Food
from app.services.seed_service import (
    find_starter_foods_file,
    load_and_validate_starter_foods,
    seed_starter_foods,
)
from tests.mock_db import AsyncMockDatabase


def test_starter_foods_file_exists():
    path = find_starter_foods_file()
    assert path.is_file()
    assert path.name == "starter_foods.json"


def test_starter_foods_json_structure_and_validation():
    path = find_starter_foods_file()
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert isinstance(data, list)
    assert len(data) >= 15, "Starter foods dataset should have at least 15 curated staple foods"

    foods = load_and_validate_starter_foods(path)
    assert len(foods) == len(data)

    names = set()
    for food in foods:
        assert isinstance(food, Food)
        assert food.is_system is True
        assert food.created_by is None
        assert food.provenance.source_type == "system"
        assert food.provenance.source_name == "starter_pack"
        assert len(food.serving_sizes) >= 1
        assert any(s.is_default for s in food.serving_sizes), f"{food.name} missing default serving size"
        assert food.nutrients_per_100g.calories >= 0
        assert food.nutrients_per_100g.protein_g >= 0
        assert food.nutrients_per_100g.carbs_g >= 0
        assert food.nutrients_per_100g.fat_g >= 0

        # Unique name per brand
        key = (food.name, food.brand)
        assert key not in names, f"Duplicate food entry detected: {key}"
        names.add(key)


@pytest.mark.asyncio
async def test_seed_starter_foods_idempotency(mock_db: AsyncMockDatabase):
    # First seed run: all items created
    summary1 = await seed_starter_foods(db=mock_db)
    total_processed = summary1["total_processed"]
    assert total_processed >= 15
    assert summary1["created"] == total_processed
    assert summary1["updated"] == 0

    count_after_first = await mock_db.foods.count_documents({"is_system": True})
    assert count_after_first == total_processed

    # Second seed run: 0 new items created, all updated
    summary2 = await seed_starter_foods(db=mock_db)
    assert summary2["total_processed"] == total_processed
    assert summary2["created"] == 0
    assert summary2["updated"] == total_processed

    count_after_second = await mock_db.foods.count_documents({"is_system": True})
    assert count_after_second == total_processed, "Idempotent seeding must not create duplicate records"


@pytest.mark.asyncio
async def test_seed_does_not_modify_user_foods(mock_db: AsyncMockDatabase):
    user_id = ObjectId()
    user_food = {
        "_id": ObjectId(),
        "name": "Rolled Oats",  # Same name as system food, but user-owned
        "brand": "Custom Brand",
        "barcode": None,
        "is_system": False,
        "created_by": user_id,
        "provenance": {
            "source_type": "user",
            "source_name": "custom",
            "external_id": None,
            "attribution": None,
            "license": None,
        },
        "serving_sizes": [{"serving_id": "srv_1", "description": "100g", "weight_g": 100.0, "is_default": True}],
        "nutrients_per_100g": {
            "calories": 400.0,
            "protein_g": 15.0,
            "carbs_g": 70.0,
            "fat_g": 5.0,
            "fiber_g": 8.0,
            "sugar_g": 1.0,
            "sodium_mg": 0.0,
        },
        "tags": ["custom"],
    }
    await mock_db.foods.insert_one(user_food)

    # Run seed
    await seed_starter_foods(db=mock_db)

    # Fetch user food back
    stored = await mock_db.foods.find_one({"created_by": user_id})
    assert stored is not None
    assert stored["is_system"] is False
    assert stored["created_by"] == user_id
    assert stored["brand"] == "Custom Brand"
    assert stored["nutrients_per_100g"]["calories"] == 400.0
