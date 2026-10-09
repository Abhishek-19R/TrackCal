import math
import pytest
from app.core.exceptions import NutritionCalculationError
from app.models.food import NutrientsPer100g
from app.models.meal_log import ComputedNutrients, MealItem, SelectedServing
from app.services.nutrition_calculator import (
    aggregate_nutrients,
    calculate_nutrients,
    recalculate_from_snapshot,
    validate_non_negative_number,
    validate_positive_number,
)
from bson import ObjectId


def test_validate_positive_number_valid():
    assert validate_positive_number(100.0) == 100.0
    assert validate_positive_number(0.5) == 0.5
    assert validate_positive_number(42) == 42.0


def test_validate_positive_number_invalid():
    with pytest.raises(NutritionCalculationError):
        validate_positive_number(0.0)
    with pytest.raises(NutritionCalculationError):
        validate_positive_number(-5.0)
    with pytest.raises(NutritionCalculationError):
        validate_positive_number(float("nan"))
    with pytest.raises(NutritionCalculationError):
        validate_positive_number(float("inf"))
    with pytest.raises(NutritionCalculationError):
        validate_positive_number("not_a_number")


def test_validate_non_negative_number_valid():
    assert validate_non_negative_number(0.0) == 0.0
    assert validate_non_negative_number(12.3) == 12.3


def test_validate_non_negative_number_invalid():
    with pytest.raises(NutritionCalculationError):
        validate_non_negative_number(-0.1)
    with pytest.raises(NutritionCalculationError):
        validate_non_negative_number(float("nan"))
    with pytest.raises(NutritionCalculationError):
        validate_non_negative_number(float("-inf"))


def test_calculate_nutrients_100g_basis():
    # Exactly 100g and 1 serving => output should equal input per 100g
    nutrients = NutrientsPer100g(
        calories=389.0,
        protein_g=16.9,
        carbs_g=66.3,
        fat_g=6.9,
        fiber_g=10.6,
        sugar_g=0.0,
        sodium_mg=2.0,
    )
    res = calculate_nutrients(nutrients, serving_weight_g=100.0, number_of_servings=1.0)
    assert res.calories == 389.0
    assert res.protein_g == 16.9
    assert res.carbs_g == 66.3
    assert res.fat_g == 6.9
    assert res.fiber_g == 10.6


def test_calculate_nutrients_scaling_and_fractional():
    nutrients = NutrientsPer100g(
        calories=200.0,
        protein_g=20.0,
        carbs_g=10.0,
        fat_g=5.0,
        fiber_g=2.0,
    )
    # Serving weight 80g, 1.5 servings => 120g total (factor = 1.2)
    res = calculate_nutrients(nutrients, serving_weight_g=80.0, number_of_servings=1.5)
    assert res.calories == 240.0
    assert res.protein_g == 24.0
    assert res.carbs_g == 12.0
    assert res.fat_g == 6.0
    assert res.fiber_g == 2.4


def test_calculate_nutrients_rounding():
    # 33.3g with 1 serving => factor 0.333
    nutrients = {"calories": 100.0, "protein_g": 33.333, "carbs_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0}
    res = calculate_nutrients(nutrients, serving_weight_g=33.3, number_of_servings=1.0)
    assert res.calories == 33.3
    assert res.protein_g == 11.1


def test_calculate_nutrients_missing_optional_fields():
    # Dict without fiber => should default fiber to 0.0
    partial = {"calories": 150.0, "protein_g": 5.0, "carbs_g": 20.0, "fat_g": 3.0}
    res = calculate_nutrients(partial, serving_weight_g=100.0, number_of_servings=1.0)
    assert res.calories == 150.0
    assert res.fiber_g == 0.0


def test_aggregate_nutrients_multiple_items():
    cn1 = ComputedNutrients(calories=250.4, protein_g=12.2, carbs_g=30.1, fat_g=5.0, fiber_g=3.2)
    cn2 = ComputedNutrients(calories=150.3, protein_g=25.1, carbs_g=0.5, fat_g=2.3, fiber_g=0.0)

    total = aggregate_nutrients([cn1, cn2])
    assert total.calories == 400.7
    assert total.protein_g == 37.3
    assert total.carbs_g == 30.6
    assert total.fat_g == 7.3
    assert total.fiber_g == 3.2


def test_aggregate_nutrients_empty():
    total = aggregate_nutrients([])
    assert total.calories == 0.0
    assert total.protein_g == 0.0
    assert total.carbs_g == 0.0
    assert total.fat_g == 0.0
    assert total.fiber_g == 0.0


def test_recalculate_from_snapshot():
    item = MealItem(
        food_id=ObjectId(),
        food_name="Old Food",
        serving_selected=SelectedServing(description="1 bowl", weight_g=200.0),
        number_of_servings=1.0,
        total_weight_g=200.0,
        computed_nutrients=ComputedNutrients(
            calories=400.0,
            protein_g=20.0,
            carbs_g=50.0,
            fat_g=10.0,
            fiber_g=6.0,
        ),
    )
    # Recalculate with 2.0 servings of same 200g serving
    updated = recalculate_from_snapshot(item, new_serving_weight_g=200.0, new_number_of_servings=2.0)
    assert updated.calories == 800.0
    assert updated.protein_g == 40.0
    assert updated.carbs_g == 100.0
    assert updated.fat_g == 20.0
    assert updated.fiber_g == 12.0
