import pytest
from bson import ObjectId
from httpx import AsyncClient

from app.api.deps import DEFAULT_USER_ID, get_current_user
from app.core.auth import CurrentUser
from app.main import app
from tests.mock_db import AsyncMockDatabase

USER_A_ID = DEFAULT_USER_ID
USER_B_ID = ObjectId("65f000000000000000000002")


@pytest.mark.anyio
async def test_log_weight_success_and_unit_normalization(client_with_db: AsyncClient):
    # 1. Log with weight_kg directly
    resp1 = await client_with_db.post(
        "/api/v1/weights",
        json={"date": "2026-10-08", "weight_kg": 76.5, "note": "Morning fasted"},
    )
    assert resp1.status_code == 201
    data1 = resp1.json()
    assert data1["date"] == "2026-10-08"
    assert data1["weight_kg"] == 76.5
    assert data1["unit"] == "kg"
    assert data1["note"] == "Morning fasted"
    assert data1["id"] != ""

    # 2. Log with lbs unit: 165.35 lbs => round(165.35 * 0.45359237, 2) = 75.0 kg
    resp2 = await client_with_db.post(
        "/api/v1/weights",
        json={"date": "2026-10-09", "weight": 165.35, "unit": "lbs", "note": "Converted from lbs"},
    )
    assert resp2.status_code == 201
    data2 = resp2.json()
    assert data2["date"] == "2026-10-09"
    assert data2["weight_kg"] == 75.0
    assert data2["unit"] == "kg"


@pytest.mark.anyio
async def test_weight_upsert_on_same_date(client_with_db: AsyncClient):
    # Log initial weight on 2026-10-05
    resp1 = await client_with_db.post(
        "/api/v1/weights",
        json={"date": "2026-10-05", "weight_kg": 77.0, "note": "First weigh-in"},
    )
    assert resp1.status_code == 201
    entry_id = resp1.json()["id"]

    # Log new weight on same date => should update existing entry
    resp2 = await client_with_db.post(
        "/api/v1/weights",
        json={"date": "2026-10-05", "weight_kg": 76.2, "note": "Evening re-check"},
    )
    assert resp2.status_code == 201
    data2 = resp2.json()
    assert data2["id"] == entry_id
    assert data2["weight_kg"] == 76.2
    assert data2["note"] == "Evening re-check"

    # List should contain only one entry for that date
    list_resp = await client_with_db.get("/api/v1/weights")
    assert list_resp.status_code == 200
    entries = [e for e in list_resp.json() if e["date"] == "2026-10-05"]
    assert len(entries) == 1
    assert entries[0]["weight_kg"] == 76.2


@pytest.mark.anyio
async def test_weight_history_ordering_and_filtering(client_with_db: AsyncClient):
    dates = ["2026-10-01", "2026-10-03", "2026-10-02"]
    for d in dates:
        await client_with_db.post(
            "/api/v1/weights",
            json={"date": d, "weight_kg": 75.0},
        )

    # List all: should be descending order (2026-10-03, 2026-10-02, 2026-10-01)
    resp = await client_with_db.get("/api/v1/weights")
    assert resp.status_code == 200
    items = resp.json()
    retrieved_dates = [item["date"] for item in items if item["date"] in dates]
    assert retrieved_dates == ["2026-10-03", "2026-10-02", "2026-10-01"]

    # Filter by date range: start_date=2026-10-02, end_date=2026-10-03
    range_resp = await client_with_db.get("/api/v1/weights?start_date=2026-10-02&end_date=2026-10-03")
    assert range_resp.status_code == 200
    range_dates = [item["date"] for item in range_resp.json() if item["date"] in dates]
    assert range_dates == ["2026-10-03", "2026-10-02"]


@pytest.mark.anyio
async def test_delete_weight_entry(client_with_db: AsyncClient):
    resp = await client_with_db.post(
        "/api/v1/weights",
        json={"date": "2026-10-07", "weight_kg": 74.5},
    )
    weight_id = resp.json()["id"]

    # Delete
    del_resp = await client_with_db.delete(f"/api/v1/weights/{weight_id}")
    assert del_resp.status_code == 204

    # Deleting again should return 404
    del_resp2 = await client_with_db.delete(f"/api/v1/weights/{weight_id}")
    assert del_resp2.status_code == 404


@pytest.mark.anyio
async def test_cross_user_isolation_weights(client_with_db: AsyncClient):
    # User A records weight
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=USER_A_ID, email="user_a@test.local", username="user_a"
    )
    resp = await client_with_db.post(
        "/api/v1/weights",
        json={"date": "2026-10-06", "weight_kg": 78.0},
    )
    weight_id = resp.json()["id"]

    # Switch to User B
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=USER_B_ID, email="user_b@test.local", username="user_b"
    )

    # User B should not see User A's entry
    list_resp = await client_with_db.get("/api/v1/weights")
    assert list_resp.status_code == 200
    assert not any(item["id"] == weight_id for item in list_resp.json())

    # User B cannot delete User A's entry (404)
    del_resp = await client_with_db.delete(f"/api/v1/weights/{weight_id}")
    assert del_resp.status_code == 404

    # Reset override
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.anyio
async def test_weight_invalid_inputs(client_with_db: AsyncClient):
    # 1. Invalid date
    bad_date = await client_with_db.post(
        "/api/v1/weights",
        json={"date": "not-a-date", "weight_kg": 75.0},
    )
    assert bad_date.status_code == 422

    # 2. Weight out of bounds (< 20 kg)
    too_light = await client_with_db.post(
        "/api/v1/weights",
        json={"date": "2026-10-09", "weight_kg": 15.0},
    )
    assert too_light.status_code == 422

    # 3. Weight out of bounds (> 500 kg)
    too_heavy = await client_with_db.post(
        "/api/v1/weights",
        json={"date": "2026-10-09", "weight_kg": 600.0},
    )
    assert too_heavy.status_code == 422

    # 4. Neither weight nor weight_kg provided
    missing_weight = await client_with_db.post(
        "/api/v1/weights",
        json={"date": "2026-10-09"},
    )
    assert missing_weight.status_code == 422

    # 5. Invalid weight_id format on delete
    bad_id = await client_with_db.delete("/api/v1/weights/invalid-id")
    assert bad_id.status_code == 400
