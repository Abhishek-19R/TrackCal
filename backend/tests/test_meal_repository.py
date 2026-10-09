import pytest
from bson import ObjectId

from app.models.meal_log import ComputedNutrients, MealItem, MealLog, SelectedServing
from app.repositories.meal_repository import MealRepository
from tests.mock_db import AsyncMockDatabase


@pytest.mark.anyio
async def test_meal_repository_create_and_get(mock_db: AsyncMockDatabase):
    repo = MealRepository(mock_db)
    user_id = ObjectId()

    item = MealItem(
        food_id=ObjectId(),
        food_name="Oats",
        serving_selected=SelectedServing(description="100g", weight_g=100.0),
        number_of_servings=1.0,
        total_weight_g=100.0,
        computed_nutrients=ComputedNutrients(
            calories=389.0, protein_g=16.9, carbs_g=66.3, fat_g=6.9, fiber_g=10.6
        ),
    )

    meal = MealLog(
        user_id=user_id,
        date="2026-10-09",
        meal_type="breakfast",
        items=[item],
        notes="Morning bowl",
    )

    created = await repo.create(meal)
    assert created.id is not None

    # Get by id
    fetched = await repo.get_by_id(created.id, user_id)
    assert fetched is not None
    assert fetched.notes == "Morning bowl"
    assert len(fetched.items) == 1

    # Cross user cannot fetch by id
    other_user = ObjectId()
    assert await repo.get_by_id(created.id, other_user) is None

    # Get by user, date, type
    by_type = await repo.get_by_user_date_and_type(user_id, "2026-10-09", "breakfast")
    assert by_type is not None
    assert by_type.id == created.id

    # Find by item id
    found_by_item = await repo.find_meal_by_item_id(item.log_item_id, user_id)
    assert found_by_item is not None
    assert found_by_item.id == created.id

    # Other user cannot find by item id
    assert await repo.find_meal_by_item_id(item.log_item_id, other_user) is None


@pytest.mark.anyio
async def test_meal_repository_update_and_delete(mock_db: AsyncMockDatabase):
    repo = MealRepository(mock_db)
    user_id = ObjectId()

    meal = MealLog(
        user_id=user_id,
        date="2026-10-09",
        meal_type="lunch",
        items=[],
    )
    created = await repo.create(meal)

    # Update
    created.notes = "Updated note"
    updated = await repo.update(created)
    assert updated.notes == "Updated note"

    # Delete
    deleted = await repo.delete(created.id, user_id)
    assert deleted is True
    assert await repo.get_by_id(created.id, user_id) is None
