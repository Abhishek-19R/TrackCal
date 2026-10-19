from bson import ObjectId
import pytest
from httpx import AsyncClient

from tests.mock_db import AsyncMockDatabase


@pytest.mark.anyio
async def test_get_default_settings(client_with_db: AsyncClient):
    user_id = str(ObjectId())
    headers = {"X-User-ID": user_id}

    response = await client_with_db.get("/api/v1/user/settings", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["user_id"] == user_id
    assert data["calorie_target"] == 2000
    assert data["protein_target_g"] == 150.0
    assert data["is_custom_override"] is False
    assert data["profile"]["is_onboarding_completed"] is False


@pytest.mark.anyio
async def test_complete_onboarding_metric(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    user_id = str(ObjectId())
    headers = {"X-User-ID": user_id}

    payload = {
        "height_cm": 180.0,
        "weight_kg": 80.0,
        "age_years": 30,
        "sex": "male",
        "activity_level": "moderately_active",
        "goal": "gain",
        "unit_system": "metric",
    }

    response = await client_with_db.post("/api/v1/user/onboarding", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()

    # BMR for 80kg, 180cm, 30yo male = 1780.0
    # TDEE for moderately_active (1.55) = 1780 * 1.55 = 2759.0
    # Gain delta = +300 -> 3059
    assert data["profile"]["is_onboarding_completed"] is True
    assert data["profile"]["height_cm"] == 180.0
    assert data["profile"]["weight_kg"] == 80.0
    assert data["bmr_estimate"] == 1780.0
    assert data["tdee_estimate"] == 2759.0
    assert data["calorie_target"] == 3059
    # Gain protein = 80 * 2.0 = 160.0g
    assert data["protein_target_g"] == 160.0
    assert data["is_custom_override"] is False

    # Check baseline weigh-in was automatically logged
    weight_entry = await mock_db.weight_logs.find_one({"user_id": ObjectId(user_id)})
    assert weight_entry is not None
    assert weight_entry["weight_kg"] == 80.0


@pytest.mark.anyio
async def test_complete_onboarding_imperial(client_with_db: AsyncClient):
    user_id = str(ObjectId())
    headers = {"X-User-ID": user_id}

    # 5 ft 10 in = 70 in = 177.8 cm
    # 165 lbs = 74.84 kg
    payload = {
        "height_ft": 5,
        "height_in": 10.0,
        "weight_lbs": 165.0,
        "age_years": 25,
        "sex": "female",
        "activity_level": "lightly_active",
        "goal": "lose",
        "unit_system": "imperial",
    }

    response = await client_with_db.post("/api/v1/user/onboarding", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["profile"]["is_onboarding_completed"] is True
    assert abs(data["profile"]["height_cm"] - 177.8) < 0.2
    assert abs(data["profile"]["weight_kg"] - 74.84) < 0.2
    assert data["unit_system"] == "imperial"
    # Lose protein = ~74.84 * 1.8 = ~135.0g
    assert abs(data["protein_target_g"] - 135.0) < 2.0


@pytest.mark.anyio
async def test_onboarding_under_18_rejected(client_with_db: AsyncClient):
    user_id = str(ObjectId())
    headers = {"X-User-ID": user_id}

    payload = {
        "height_cm": 170.0,
        "weight_kg": 60.0,
        "age_years": 16,
        "sex": "male",
        "activity_level": "moderately_active",
        "goal": "maintain",
    }

    response = await client_with_db.post("/api/v1/user/onboarding", json=payload, headers=headers)
    assert response.status_code == 400
    assert "under 18" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_onboarding_invalid_ranges(client_with_db: AsyncClient):
    user_id = str(ObjectId())
    headers = {"X-User-ID": user_id}

    # Implausibly low weight
    res1 = await client_with_db.post(
        "/api/v1/user/onboarding",
        json={
            "height_cm": 170.0,
            "weight_kg": 10.0,
            "age_years": 25,
            "sex": "male",
            "activity_level": "sedentary",
            "goal": "maintain",
        },
        headers=headers,
    )
    assert res1.status_code == 422 or res1.status_code == 400

    # Implausibly high height
    res2 = await client_with_db.post(
        "/api/v1/user/onboarding",
        json={
            "height_cm": 300.0,
            "weight_kg": 70.0,
            "age_years": 25,
            "sex": "male",
            "activity_level": "sedentary",
            "goal": "maintain",
        },
        headers=headers,
    )
    assert res2.status_code == 422 or res2.status_code == 400


@pytest.mark.anyio
async def test_profile_update_and_override_behavior(client_with_db: AsyncClient):
    user_id = str(ObjectId())
    headers = {"X-User-ID": user_id}

    # 1. Complete initial onboarding
    onboard_payload = {
        "height_cm": 175.0,
        "weight_kg": 75.0,
        "age_years": 25,
        "sex": "male",
        "activity_level": "sedentary",
        "goal": "maintain",
    }
    res_onboard = await client_with_db.post(
        "/api/v1/user/onboarding", json=onboard_payload, headers=headers
    )
    assert res_onboard.status_code == 200
    initial_cals = res_onboard.json()["calorie_target"]
    assert res_onboard.json()["is_custom_override"] is False

    # 2. Update profile to "moderately_active" -> should automatically recalculate since not overridden
    res_prof1 = await client_with_db.put(
        "/api/v1/user/profile",
        json={"activity_level": "moderately_active"},
        headers=headers,
    )
    assert res_prof1.status_code == 200
    new_cals = res_prof1.json()["calorie_target"]
    assert new_cals > initial_cals
    assert res_prof1.json()["is_custom_override"] is False

    # 3. User enters explicit manual target override
    res_targets = await client_with_db.put(
        "/api/v1/user/targets",
        json={"calorie_target": 2450, "protein_target_g": 185.0},
        headers=headers,
    )
    assert res_targets.status_code == 200
    assert res_targets.json()["calorie_target"] == 2450
    assert res_targets.json()["protein_target_g"] == 185.0
    assert res_targets.json()["is_custom_override"] is True

    # 4. Update profile weight -> override must be preserved!
    res_prof2 = await client_with_db.put(
        "/api/v1/user/profile",
        json={"weight_kg": 77.0},
        headers=headers,
    )
    assert res_prof2.status_code == 200
    # Custom targets retained
    assert res_prof2.json()["calorie_target"] == 2450
    assert res_prof2.json()["protein_target_g"] == 185.0
    assert res_prof2.json()["is_custom_override"] is True
    # But BMR/TDEE estimates updated
    assert res_prof2.json()["profile"]["weight_kg"] == 77.0

    # 5. User requests explicit recalculation to clear override
    res_recalc = await client_with_db.post(
        "/api/v1/user/recalculate-targets",
        headers=headers,
    )
    assert res_recalc.status_code == 200
    assert res_recalc.json()["is_custom_override"] is False
    assert res_recalc.json()["calorie_target"] != 2450


@pytest.mark.anyio
async def test_calculate_preview_does_not_persist(client_with_db: AsyncClient, mock_db: AsyncMockDatabase):
    payload = {
        "height_cm": 180.0,
        "weight_kg": 80.0,
        "age_years": 30,
        "sex": "male",
        "activity_level": "very_active",
        "goal": "gain",
    }
    response = await client_with_db.post("/api/v1/user/calculate-preview", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "calorie_target" in data
    assert "protein_target_g" in data
    assert data["goal"] == "gain"

    # Verify no documents were inserted into database
    count = len(mock_db.user_settings.docs)
    assert count == 0


@pytest.mark.anyio
async def test_cross_user_settings_isolation(client_with_db: AsyncClient):
    user_a = str(ObjectId())
    user_b = str(ObjectId())

    # User A onboards with 3000 kcal gain goal
    await client_with_db.post(
        "/api/v1/user/onboarding",
        json={
            "height_cm": 185.0,
            "weight_kg": 85.0,
            "age_years": 28,
            "sex": "male",
            "activity_level": "very_active",
            "goal": "gain",
        },
        headers={"X-User-ID": user_a},
    )

    # User B onboards with 1600 kcal lose goal
    await client_with_db.post(
        "/api/v1/user/onboarding",
        json={
            "height_cm": 160.0,
            "weight_kg": 60.0,
            "age_years": 35,
            "sex": "female",
            "activity_level": "sedentary",
            "goal": "lose",
        },
        headers={"X-User-ID": user_b},
    )

    # Fetch User A
    res_a = await client_with_db.get("/api/v1/user/settings", headers={"X-User-ID": user_a})
    # Fetch User B
    res_b = await client_with_db.get("/api/v1/user/settings", headers={"X-User-ID": user_b})

    data_a = res_a.json()
    data_b = res_b.json()

    assert data_a["user_id"] == user_a
    assert data_b["user_id"] == user_b
    assert data_a["profile"]["goal"] == "gain"
    assert data_b["profile"]["goal"] == "lose"
    assert data_a["calorie_target"] != data_b["calorie_target"]
