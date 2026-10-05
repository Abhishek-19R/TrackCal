import pytest
from bson import ObjectId
from httpx import AsyncClient

from app.services.seed_service import seed_starter_foods
from tests.mock_db import AsyncMockDatabase

USER1_ID = str(ObjectId())
USER2_ID = str(ObjectId())


@pytest.mark.asyncio
async def test_api_search_and_empty_query(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    # Seed starter foods into the mock database
    await seed_starter_foods(db=mock_db)

    # 1. Search without query term: returns starter foods paginated
    res = await client_with_db.get("/api/v1/foods/search")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 15
    assert len(data["items"]) == 20 or len(data["items"]) == data["total"]
    assert data["page"] == 1
    assert data["limit"] == 20

    # 2. Search with empty string: clean handling
    res_empty = await client_with_db.get("/api/v1/foods/search?q=")
    assert res_empty.status_code == 200
    assert res_empty.json()["total"] == data["total"]

    # 3. Search with specific keyword: "Oats"
    res_keyword = await client_with_db.get("/api/v1/foods/search?q=Oats")
    assert res_keyword.status_code == 200
    kw_data = res_keyword.json()
    assert kw_data["total"] >= 1
    assert any("oats" in item["name"].lower() for item in kw_data["items"])


@pytest.mark.asyncio
async def test_api_search_pagination(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    await seed_starter_foods(db=mock_db)

    # Page 1, limit 5
    res1 = await client_with_db.get("/api/v1/foods/search?page=1&limit=5")
    assert res1.status_code == 200
    d1 = res1.json()
    assert len(d1["items"]) == 5
    assert d1["page"] == 1
    assert d1["limit"] == 5

    # Page 2, limit 5
    res2 = await client_with_db.get("/api/v1/foods/search?page=2&limit=5")
    assert res2.status_code == 200
    d2 = res2.json()
    assert len(d2["items"]) == 5
    assert d2["page"] == 2

    # Verify pages contain distinct items
    p1_ids = {item["id"] for item in d1["items"]}
    p2_ids = {item["id"] for item in d2["items"]}
    assert p1_ids.isdisjoint(p2_ids)


@pytest.mark.asyncio
async def test_api_create_custom_food(client_with_db: AsyncClient):
    payload = {
        "name": "My Custom Protein Pancake",
        "brand": "Homemade",
        "serving_sizes": [
            {"description": "1 pancake (80g)", "weight_g": 80.0, "is_default": True}
        ],
        "nutrients_per_100g": {
            "calories": 185.0,
            "protein_g": 14.5,
            "carbs_g": 22.0,
            "fat_g": 3.5,
            "fiber_g": 2.0,
            "sugar_g": 3.0,
            "sodium_mg": 210.0,
        },
        "tags": ["breakfast", "high-protein"],
    }

    res = await client_with_db.post(
        "/api/v1/foods",
        json=payload,
        headers={"X-User-ID": USER1_ID},
    )
    assert res.status_code == 201
    food = res.json()
    assert food["name"] == "My Custom Protein Pancake"
    assert food["brand"] == "Homemade"
    assert food["is_system"] is False
    assert food["created_by"] == USER1_ID
    assert food["provenance"]["source_type"] == "user"
    assert food["provenance"]["source_name"] == "custom"
    assert len(food["serving_sizes"]) == 1
    assert food["nutrients_per_100g"]["protein_g"] == 14.5


@pytest.mark.asyncio
async def test_api_read_food_permissions_and_cross_user_isolation(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    await seed_starter_foods(db=mock_db)

    # 1. Fetch system food: readable by anyone (USER1 and USER2)
    system_food_doc = await mock_db.foods.find_one({"is_system": True})
    sys_id = str(system_food_doc["_id"])

    res_user1_sys = await client_with_db.get(f"/api/v1/foods/{sys_id}", headers={"X-User-ID": USER1_ID})
    assert res_user1_sys.status_code == 200
    assert res_user1_sys.json()["is_system"] is True

    res_user2_sys = await client_with_db.get(f"/api/v1/foods/{sys_id}", headers={"X-User-ID": USER2_ID})
    assert res_user2_sys.status_code == 200

    # 2. USER1 creates a private custom food
    create_res = await client_with_db.post(
        "/api/v1/foods",
        json={
            "name": "User 1 Secret Recipe",
            "nutrients_per_100g": {"calories": 100.0, "protein_g": 10.0, "carbs_g": 10.0, "fat_g": 1.0},
        },
        headers={"X-User-ID": USER1_ID},
    )
    user1_food_id = create_res.json()["id"]

    # 3. USER1 can read their own food
    res_owner = await client_with_db.get(f"/api/v1/foods/{user1_food_id}", headers={"X-User-ID": USER1_ID})
    assert res_owner.status_code == 200
    assert res_owner.json()["name"] == "User 1 Secret Recipe"

    # 4. USER2 CANNOT read USER1's custom food (must return 404 to avoid leaking existence)
    res_other_user = await client_with_db.get(f"/api/v1/foods/{user1_food_id}", headers={"X-User-ID": USER2_ID})
    assert res_other_user.status_code == 404

    # 5. USER1 sees their custom food in search, but USER2 does NOT
    u1_search = await client_with_db.get("/api/v1/foods/search?q=Secret", headers={"X-User-ID": USER1_ID})
    assert u1_search.status_code == 200
    assert u1_search.json()["total"] == 1

    u2_search = await client_with_db.get("/api/v1/foods/search?q=Secret", headers={"X-User-ID": USER2_ID})
    assert u2_search.status_code == 200
    assert u2_search.json()["total"] == 0, "Cross-user custom food must never leak in search results"


@pytest.mark.asyncio
async def test_api_update_food_rules(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    await seed_starter_foods(db=mock_db)

    # 1. System food cannot be updated by normal users (must return 403)
    sys_doc = await mock_db.foods.find_one({"is_system": True})
    sys_id = str(sys_doc["_id"])

    res_sys_update = await client_with_db.put(
        f"/api/v1/foods/{sys_id}",
        json={"name": "Hacked System Food"},
        headers={"X-User-ID": USER1_ID},
    )
    assert res_sys_update.status_code == 403
    assert "System foods cannot be modified" in res_sys_update.json()["detail"]

    # 2. USER1 creates a custom food
    create_res = await client_with_db.post(
        "/api/v1/foods",
        json={
            "name": "Custom Shake",
            "nutrients_per_100g": {"calories": 150.0, "protein_g": 20.0, "carbs_g": 5.0, "fat_g": 2.0},
        },
        headers={"X-User-ID": USER1_ID},
    )
    custom_id = create_res.json()["id"]

    # 3. USER2 attempts to update USER1's food -> must return 403
    res_unauth_update = await client_with_db.put(
        f"/api/v1/foods/{custom_id}",
        json={"name": "Compromised Shake"},
        headers={"X-User-ID": USER2_ID},
    )
    assert res_unauth_update.status_code == 403

    # 4. USER1 updates their own food -> 200 Success
    res_owner_update = await client_with_db.put(
        f"/api/v1/foods/{custom_id}",
        json={"name": "Custom Chocolate Shake", "nutrients_per_100g": {"calories": 170.0, "protein_g": 22.0, "carbs_g": 6.0, "fat_g": 3.0}},
        headers={"X-User-ID": USER1_ID},
    )
    assert res_owner_update.status_code == 200
    assert res_owner_update.json()["name"] == "Custom Chocolate Shake"
    assert res_owner_update.json()["nutrients_per_100g"]["calories"] == 170.0


@pytest.mark.asyncio
async def test_api_delete_food_rules(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    await seed_starter_foods(db=mock_db)

    # 1. System food deletion must be rejected with 403
    sys_doc = await mock_db.foods.find_one({"is_system": True})
    sys_id = str(sys_doc["_id"])

    res_sys_del = await client_with_db.delete(f"/api/v1/foods/{sys_id}", headers={"X-User-ID": USER1_ID})
    assert res_sys_del.status_code == 403
    assert "System foods cannot be deleted" in res_sys_del.json()["detail"]

    # 2. USER1 creates a custom food
    create_res = await client_with_db.post(
        "/api/v1/foods",
        json={
            "name": "Temporary Snack",
            "nutrients_per_100g": {"calories": 50.0, "protein_g": 1.0, "carbs_g": 10.0, "fat_g": 0.0},
        },
        headers={"X-User-ID": USER1_ID},
    )
    custom_id = create_res.json()["id"]

    # 3. USER2 tries to delete USER1's food -> 403
    res_other_del = await client_with_db.delete(f"/api/v1/foods/{custom_id}", headers={"X-User-ID": USER2_ID})
    assert res_other_del.status_code == 403

    # 4. USER1 deletes their own food -> 204 No Content
    res_owner_del = await client_with_db.delete(f"/api/v1/foods/{custom_id}", headers={"X-User-ID": USER1_ID})
    assert res_owner_del.status_code == 204

    # 5. Subsequent GET by owner returns 404
    res_after_del = await client_with_db.get(f"/api/v1/foods/{custom_id}", headers={"X-User-ID": USER1_ID})
    assert res_after_del.status_code == 404


@pytest.mark.asyncio
async def test_api_invalid_and_nonexistent_ids(client_with_db: AsyncClient):
    # Invalid ObjectId string -> 400 Bad Request
    res_invalid_get = await client_with_db.get("/api/v1/foods/not-a-valid-hex-id")
    assert res_invalid_get.status_code == 400
    assert "Invalid food ID format" in res_invalid_get.json()["detail"]

    res_invalid_put = await client_with_db.put("/api/v1/foods/invalid-id", json={"name": "test"})
    assert res_invalid_put.status_code == 400

    res_invalid_del = await client_with_db.delete("/api/v1/foods/invalid-id")
    assert res_invalid_del.status_code == 400

    # Nonexistent valid ObjectId -> 404 Not Found
    random_id = str(ObjectId())
    res_not_found_get = await client_with_db.get(f"/api/v1/foods/{random_id}")
    assert res_not_found_get.status_code == 404

    res_not_found_put = await client_with_db.put(f"/api/v1/foods/{random_id}", json={"name": "test"})
    assert res_not_found_put.status_code == 404

    res_not_found_del = await client_with_db.delete(f"/api/v1/foods/{random_id}")
    assert res_not_found_del.status_code == 404
