from bson import ObjectId
import pytest
from pydantic import ValidationError

from app.models.common import PyObjectId
from app.models.food import Food, NutrientsPer100g, ServingSize
from app.models.meal_log import (
    ComputedNutrients,
    MealItem,
    MealLog,
    SelectedServing,
)
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.weight_log import WeightLog


# ---------------------------------------------------------------------------
# PyObjectId Tests
# ---------------------------------------------------------------------------
def test_py_object_id_valid():
    oid = ObjectId()
    user = User(
        _id=oid,
        email="test@example.com",
        username="testuser",
        hashed_password="hashed_pw_secret",
    )
    assert user.id == oid
    # Check Python dump mode preserves ObjectId for MongoDB driver
    py_data = user.model_dump(by_alias=True)
    assert py_data["_id"] == oid
    # Check JSON dump mode serializes ObjectId to string for APIs
    json_data = user.model_dump(mode="json", by_alias=True)
    assert json_data["_id"] == str(oid)
    dumped_json = user.model_dump_json()
    assert str(oid) in dumped_json


def test_py_object_id_from_valid_str():
    oid_str = "507f1f77bcf86cd799439011"
    user = User(
        _id=oid_str,
        email="test@example.com",
        username="testuser",
        hashed_password="hashed_pw_secret",
    )
    assert isinstance(user.id, ObjectId)
    assert str(user.id) == oid_str


def test_py_object_id_invalid_str():
    with pytest.raises(ValidationError):
        User(
            _id="invalid-not-an-objectid",
            email="test@example.com",
            username="testuser",
            hashed_password="hashed_pw_secret",
        )


# ---------------------------------------------------------------------------
# User Model Tests
# ---------------------------------------------------------------------------
def test_user_model_valid():
    user = User(
        email="alex@example.com",
        username="alexander",
        hashed_password="some_hashed_password",
    )
    assert user.email == "alex@example.com"
    assert user.username == "alexander"
    assert user.is_active is True
    assert user.created_at is not None


def test_user_model_invalid_email():
    with pytest.raises(ValidationError):
        User(
            email="not-an-email",
            username="alexander",
            hashed_password="some_hashed_password",
        )


def test_user_model_short_username():
    with pytest.raises(ValidationError):
        User(
            email="alex@example.com",
            username="al",  # min_length=3
            hashed_password="some_hashed_password",
        )


# ---------------------------------------------------------------------------
# UserSettings Model Tests (No AI Keys)
# ---------------------------------------------------------------------------
def test_user_settings_valid_defaults():
    uid = ObjectId()
    settings = UserSettings(user_id=uid)
    assert settings.user_id == uid
    assert settings.calorie_target == 2000
    assert settings.protein_target_g == 150.0
    assert settings.unit_system == "metric"
    # Verify no third-party API key attribute exists
    assert not hasattr(settings, "custom_api_key")
    assert not hasattr(settings, "ai_api_key")


def test_user_settings_invalid_targets():
    uid = ObjectId()
    with pytest.raises(ValidationError):
        UserSettings(user_id=uid, calorie_target=100)  # ge=500


# ---------------------------------------------------------------------------
# Food Model Tests & Data Ownership Rules
# ---------------------------------------------------------------------------
def test_system_food_ownership_valid():
    food = Food(
        name="Rolled Oats",
        is_system=True,
        created_by=None,
        nutrients_per_100g=NutrientsPer100g(
            calories=389.0, protein_g=16.9, carbs_g=66.3, fat_g=6.9
        ),
    )
    assert food.is_system is True
    assert food.created_by is None
    # Automatically populated default 100g serving if empty
    assert len(food.serving_sizes) == 1
    assert food.serving_sizes[0].description == "100g"


def test_system_food_invalid_with_created_by():
    """System foods must have created_by=None"""
    with pytest.raises(ValidationError) as exc:
        Food(
            name="Rolled Oats",
            is_system=True,
            created_by=ObjectId(),
            nutrients_per_100g=NutrientsPer100g(
                calories=389.0, protein_g=16.9, carbs_g=66.3, fat_g=6.9
            ),
        )
    assert "System foods must have created_by=None" in str(exc.value)


def test_custom_food_ownership_valid():
    uid = ObjectId()
    food = Food(
        name="Homemade Protein Shake",
        is_system=False,
        created_by=uid,
        serving_sizes=[
            ServingSize(description="1 shaker", weight_g=400.0, is_default=True)
        ],
        nutrients_per_100g=NutrientsPer100g(
            calories=80.0, protein_g=10.0, carbs_g=5.0, fat_g=2.0
        ),
    )
    assert food.is_system is False
    assert food.created_by == uid
    assert len(food.serving_sizes) == 1


def test_custom_food_invalid_without_created_by():
    """Custom foods (is_system=False) must have a non-null created_by User ID"""
    with pytest.raises(ValidationError) as exc:
        Food(
            name="Homemade Protein Shake",
            is_system=False,
            created_by=None,
            nutrients_per_100g=NutrientsPer100g(
                calories=80.0, protein_g=10.0, carbs_g=5.0, fat_g=2.0
            ),
        )
    assert "Custom foods (source_type='user') must specify created_by" in str(exc.value)


def test_external_food_provenance_valid():
    from app.models.food import FoodProvenance
    food = Food(
        name="USDA Gala Apple",
        provenance=FoodProvenance(
            source_type="external",
            source_name="usda_fdc",
            external_id="1750343",
            attribution="Agricultural Research Service, USDA",
            license="Public Domain",
        ),
        created_by=None,
        nutrients_per_100g=NutrientsPer100g(
            calories=52.0, protein_g=0.3, carbs_g=13.8, fat_g=0.2
        ),
    )
    assert food.provenance.source_type == "external"
    assert food.provenance.external_id == "1750343"
    assert food.is_system is False
    assert food.created_by is None


def test_cached_food_provenance_valid():
    from app.models.food import FoodProvenance
    food = Food(
        name="Greek Yogurt 0%",
        provenance=FoodProvenance(
            source_type="cached",
            source_name="open_food_facts",
            external_id="3017620422003",
            attribution="Open Food Facts contributors",
            license="ODbL",
        ),
        created_by=None,
        nutrients_per_100g=NutrientsPer100g(
            calories=59.0, protein_g=10.0, carbs_g=3.6, fat_g=0.4
        ),
    )
    assert food.provenance.source_type == "cached"
    assert food.is_system is False
    assert food.created_by is None


def test_external_food_invalid_with_created_by():
    from app.models.food import FoodProvenance
    with pytest.raises(ValidationError) as exc:
        Food(
            name="USDA Apple",
            provenance=FoodProvenance(source_type="external", source_name="usda_fdc"),
            created_by=ObjectId(),
            nutrients_per_100g=NutrientsPer100g(
                calories=52.0, protein_g=0.3, carbs_g=13.8, fat_g=0.2
            ),
        )
    assert "External/cached foods must have created_by=None" in str(exc.value)


# ---------------------------------------------------------------------------
# MealLog Model Tests
# ---------------------------------------------------------------------------
def test_meal_log_and_nutrition_totals():
    uid = ObjectId()
    fid = ObjectId()

    item1 = MealItem(
        food_id=fid,
        food_name="Oatmeal",
        serving_selected=SelectedServing(description="1 cup", weight_g=80.0),
        number_of_servings=1.0,
        total_weight_g=80.0,
        computed_nutrients=ComputedNutrients(
            calories=300.0, protein_g=12.0, carbs_g=50.0, fat_g=5.0, fiber_g=8.0
        ),
    )

    item2 = MealItem(
        food_id=fid,
        food_name="Almonds",
        serving_selected=SelectedServing(description="1 oz", weight_g=28.0),
        number_of_servings=1.0,
        total_weight_g=28.0,
        computed_nutrients=ComputedNutrients(
            calories=160.0, protein_g=6.0, carbs_g=6.0, fat_g=14.0, fiber_g=3.0
        ),
    )

    meal_log = MealLog(
        user_id=uid,
        date="2026-09-29",
        meal_type="breakfast",
        items=[item1, item2],
    )

    totals = meal_log.calculate_total_nutrients()
    assert totals.calories == 460.0
    assert totals.protein_g == 18.0
    assert totals.carbs_g == 56.0
    assert totals.fat_g == 19.0
    assert totals.fiber_g == 11.0


def test_meal_log_invalid_date_format():
    uid = ObjectId()
    with pytest.raises(ValidationError):
        MealLog(
            user_id=uid,
            date="29-09-2026",  # Must be YYYY-MM-DD
            meal_type="lunch",
        )


# ---------------------------------------------------------------------------
# WeightLog Model Tests
# ---------------------------------------------------------------------------
def test_weight_log_valid():
    uid = ObjectId()
    wlog = WeightLog(
        user_id=uid,
        date="2026-09-29",
        weight_kg=75.5,
        note="Morning, fasted",
    )
    assert wlog.weight_kg == 75.5
    assert wlog.date == "2026-09-29"


def test_weight_log_out_of_range():
    uid = ObjectId()
    with pytest.raises(ValidationError):
        WeightLog(user_id=uid, date="2026-09-29", weight_kg=15.0)  # gt=20.0
