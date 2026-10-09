import pytest
from bson import ObjectId
from httpx import AsyncClient

from app.api.deps import DEFAULT_USER_ID, get_current_user
from app.core.auth import CurrentUser
from app.main import app
from app.models.food import Food, FoodProvenance, NutrientsPer100g, ServingSize
from tests.mock_db import AsyncMockDatabase

USER_A_ID = DEFAULT_USER_ID
USER_B_ID = ObjectId("65f000000000000000000002")


async def create_sample_food(mock_db: AsyncMockDatabase, is_system: bool = True, created_by: ObjectId = None) -> Food:
    food = Food(
        name="Test Chicken Breast",
        is_system=is_system,
        created_by=created_by,
        provenance=FoodProvenance(source_type="system" if is_system else "user"),
        serving_sizes=[
            ServingSize(serving_id="srv_100g", description="100g", weight_g=100.0, is_default=True),
            ServingSize(serving_id="srv_fillet", description="1 breast fillet", weight_g=174.0, is_default=False),
        ],
        nutrients_per_100g=NutrientsPer100g(
            calories=165.0,
            protein_g=31.0,
            carbs_g=0.0,
            fat_g=3.6,
            fiber_g=0.0,
        ),
        tags=["protein", "chicken"],
    )
    doc = food.model_dump(by_alias=True)
    if doc.get("_id") is None:
        doc["_id"] = ObjectId()
        food.id = doc["_id"]
    await mock_db.foods.insert_one(doc)
    return food


@pytest.mark.anyio
async def test_log_meal_success_and_snapshot(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    food = await create_sample_food(mock_db)

    payload = {
        "date": "2026-10-09",
        "meal_type": "lunch",
        "items": [
            {
                "food_id": str(food.id),
                "serving_id": "srv_fillet",
                "number_of_servings": 1.5,
            }
        ],
        "notes": "Post gym meal",
    }

    resp = await client_with_db.post("/api/v1/meals/log", json=payload)
    assert resp.status_code == 201
    data = resp.json()

    assert data["date"] == "2026-10-09"
    assert data["meal_type"] == "lunch"
    assert data["notes"] == "Post gym meal"
    assert len(data["items"]) == 1

    item = data["items"][0]
    assert item["food_name"] == "Test Chicken Breast"
    assert item["serving_selected"]["description"] == "1 breast fillet"
    assert item["serving_selected"]["weight_g"] == 174.0
    assert item["number_of_servings"] == 1.5
    # total weight: 174.0 * 1.5 = 261.0g
    assert item["total_weight_g"] == 261.0
    # calories: 165.0 * 2.61 = 430.65 -> Python round() banker's rounding to even: 430.6
    assert item["computed_nutrients"]["calories"] == 430.6
    assert item["computed_nutrients"]["protein_g"] == 80.9


@pytest.mark.anyio
async def test_meal_day_retrieval_and_aggregation(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    food = await create_sample_food(mock_db)

    # 1. Log Breakfast (100g, 1 serving => 165 cal, 31g protein)
    await client_with_db.post(
        "/api/v1/meals/log",
        json={
            "date": "2026-10-10",
            "meal_type": "breakfast",
            "food_id": str(food.id),
            "number_of_servings": 1.0,
        },
    )

    # 2. Log Lunch (100g, 2 servings => 330 cal, 62g protein)
    await client_with_db.post(
        "/api/v1/meals/log",
        json={
            "date": "2026-10-10",
            "meal_type": "lunch",
            "food_id": str(food.id),
            "number_of_servings": 2.0,
        },
    )

    # 3. Retrieve day's summary
    resp = await client_with_db.get("/api/v1/meals/day/2026-10-10")
    assert resp.status_code == 200
    data = resp.json()

    assert data["date"] == "2026-10-10"
    assert len(data["meals"]) == 2
    # Daily totals: 165.0 + 330.0 = 495.0 cal, 31.0 + 62.0 = 93.0 prot
    assert data["daily_totals"]["calories"] == 495.0
    assert data["daily_totals"]["protein_g"] == 93.0


@pytest.mark.anyio
async def test_update_meal_item_and_recalculate(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    food = await create_sample_food(mock_db)

    # Initial log: 1.0 serving (165 cal)
    log_resp = await client_with_db.post(
        "/api/v1/meals/log",
        json={
            "date": "2026-10-11",
            "meal_type": "dinner",
            "food_id": str(food.id),
            "number_of_servings": 1.0,
        },
    )
    assert log_resp.status_code == 201
    item_id = log_resp.json()["items"][0]["log_item_id"]

    # Update item to 3.0 servings (300g => 495.0 cal)
    put_resp = await client_with_db.put(
        f"/api/v1/meals/items/{item_id}",
        json={"number_of_servings": 3.0},
    )
    assert put_resp.status_code == 200
    updated_data = put_resp.json()
    assert updated_data["items"][0]["number_of_servings"] == 3.0
    assert updated_data["items"][0]["computed_nutrients"]["calories"] == 495.0
    assert updated_data["total_nutrients"]["calories"] == 495.0


@pytest.mark.anyio
async def test_delete_meal_item(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    food = await create_sample_food(mock_db)

    log_resp = await client_with_db.post(
        "/api/v1/meals/log",
        json={
            "date": "2026-10-12",
            "meal_type": "snack",
            "food_id": str(food.id),
            "number_of_servings": 1.0,
        },
    )
    item_id = log_resp.json()["items"][0]["log_item_id"]

    # Delete item
    del_resp = await client_with_db.delete(f"/api/v1/meals/items/{item_id}")
    assert del_resp.status_code == 204

    # Day should now have 0 meals / 0 totals
    day_resp = await client_with_db.get("/api/v1/meals/day/2026-10-12")
    assert day_resp.status_code == 200
    assert len(day_resp.json()["meals"]) == 0
    assert day_resp.json()["daily_totals"]["calories"] == 0.0


@pytest.mark.anyio
async def test_cross_user_isolation_meals(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    food = await create_sample_food(mock_db)

    # User A logs meal
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=USER_A_ID, email="user_a@test.local", username="user_a"
    )
    log_resp = await client_with_db.post(
        "/api/v1/meals/log",
        json={
            "date": "2026-10-13",
            "meal_type": "breakfast",
            "food_id": str(food.id),
            "number_of_servings": 1.0,
        },
    )
    item_id = log_resp.json()["items"][0]["log_item_id"]

    # Switch to User B
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=USER_B_ID, email="user_b@test.local", username="user_b"
    )

    # User B cannot see User A's meal on that date
    day_resp = await client_with_db.get("/api/v1/meals/day/2026-10-13")
    assert day_resp.status_code == 200
    assert len(day_resp.json()["meals"]) == 0
    assert day_resp.json()["daily_totals"]["calories"] == 0.0

    # User B cannot update User A's logged item (404)
    put_resp = await client_with_db.put(
        f"/api/v1/meals/items/{item_id}",
        json={"number_of_servings": 5.0},
    )
    assert put_resp.status_code == 404

    # User B cannot delete User A's logged item (404)
    del_resp = await client_with_db.delete(f"/api/v1/meals/items/{item_id}")
    assert del_resp.status_code == 404

    # Reset override
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.anyio
async def test_meal_invalid_inputs(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    # 1. Invalid date format
    bad_date = await client_with_db.get("/api/v1/meals/day/2026-13-99")
    assert bad_date.status_code == 400

    # 2. Invalid food ID format
    bad_food_id = await client_with_db.post(
        "/api/v1/meals/log",
        json={"date": "2026-10-14", "meal_type": "lunch", "food_id": "not-an-objectid"},
    )
    assert bad_food_id.status_code == 400

    # 3. Nonexistent food ID
    nonexistent = await client_with_db.post(
        "/api/v1/meals/log",
        json={"date": "2026-10-14", "meal_type": "lunch", "food_id": "65f000000000000000000099"},
    )
    assert nonexistent.status_code == 404

    # 4. Invalid quantity (<= 0)
    food = await create_sample_food(mock_db)
    bad_qty = await client_with_db.post(
        "/api/v1/meals/log",
        json={
            "date": "2026-10-14",
            "meal_type": "lunch",
            "food_id": str(food.id),
            "number_of_servings": 0.0,
        },
    )
    assert bad_qty.status_code == 422  # Pydantic validation error gt=0.0
