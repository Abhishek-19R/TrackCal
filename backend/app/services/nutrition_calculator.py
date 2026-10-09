import math
from typing import Iterable, Union
from app.core.exceptions import NutritionCalculationError
from app.models.food import Food, NutrientsPer100g
from app.models.meal_log import ComputedNutrients, MealItem


def validate_positive_number(val: float, name: str = "Quantity") -> float:
    """
    Validate that a numerical quantity is finite and strictly greater than zero.
    Rejects NaN, Inf, zero, and negative values.
    """
    if not isinstance(val, (int, float)):
        raise NutritionCalculationError(f"{name} must be a number, got {type(val).__name__}")
    if math.isnan(val) or math.isinf(val):
        raise NutritionCalculationError(f"{name} must be a finite number, got {val}")
    if val <= 0.0:
        raise NutritionCalculationError(f"{name} must be strictly greater than 0, got {val}")
    return float(val)


def validate_non_negative_number(val: float, name: str = "Nutrient value") -> float:
    """
    Validate that a nutrient value is finite and non-negative (>= 0.0).
    """
    if not isinstance(val, (int, float)):
        raise NutritionCalculationError(f"{name} must be a number, got {type(val).__name__}")
    if math.isnan(val) or math.isinf(val):
        raise NutritionCalculationError(f"{name} must be a finite number, got {val}")
    if val < 0.0:
        raise NutritionCalculationError(f"{name} must be non-negative, got {val}")
    return float(val)


def calculate_nutrients(
    nutrients_per_100g: Union[NutrientsPer100g, dict],
    serving_weight_g: float,
    number_of_servings: float,
) -> ComputedNutrients:
    """
    Deterministically scales nutrition values based on serving weight and serving count.
    
    Basis:
      - Nutrients in NutriTrack are stored per 100 grams.
      - Total consumption weight (g) = serving_weight_g * number_of_servings
      - Scaling ratio = total_weight_g / 100.0
      - Results are rounded to 1 decimal place.
    """
    weight_g = validate_positive_number(serving_weight_g, "Serving weight (g)")
    servings = validate_positive_number(number_of_servings, "Number of servings")

    if isinstance(nutrients_per_100g, NutrientsPer100g):
        base = nutrients_per_100g.model_dump()
    elif isinstance(nutrients_per_100g, dict):
        base = nutrients_per_100g
    else:
        raise NutritionCalculationError(f"Unsupported nutrient data type: {type(nutrients_per_100g).__name__}")

    calories_raw = validate_non_negative_number(base.get("calories", 0.0), "Calories")
    protein_raw = validate_non_negative_number(base.get("protein_g", 0.0), "Protein")
    carbs_raw = validate_non_negative_number(base.get("carbs_g", 0.0), "Carbohydrates")
    fat_raw = validate_non_negative_number(base.get("fat_g", 0.0), "Fat")
    fiber_raw = validate_non_negative_number(base.get("fiber_g", 0.0), "Fiber")

    total_weight_g = weight_g * servings
    factor = total_weight_g / 100.0

    return ComputedNutrients(
        calories=round(calories_raw * factor, 1),
        protein_g=round(protein_raw * factor, 1),
        carbs_g=round(carbs_raw * factor, 1),
        fat_g=round(fat_raw * factor, 1),
        fiber_g=round(fiber_raw * factor, 1),
    )


def calculate_food_item_nutrients(
    food: Food,
    serving_weight_g: float,
    number_of_servings: float,
) -> ComputedNutrients:
    """Convenience helper to compute scaled nutrients directly from a Food entity."""
    return calculate_nutrients(
        nutrients_per_100g=food.nutrients_per_100g,
        serving_weight_g=serving_weight_g,
        number_of_servings=number_of_servings,
    )


def aggregate_nutrients(
    items: Iterable[Union[ComputedNutrients, MealItem]],
) -> ComputedNutrients:
    """
    Sums nutrient totals across multiple items or ComputedNutrients objects.
    Rounds all totals to 1 decimal place.
    """
    total_cal = 0.0
    total_prot = 0.0
    total_carb = 0.0
    total_fat = 0.0
    total_fiber = 0.0

    for item in items:
        if isinstance(item, MealItem):
            cn = item.computed_nutrients
        elif isinstance(item, ComputedNutrients):
            cn = item
        else:
            continue
        total_cal += cn.calories
        total_prot += cn.protein_g
        total_carb += cn.carbs_g
        total_fat += cn.fat_g
        total_fiber += cn.fiber_g

    return ComputedNutrients(
        calories=round(total_cal, 1),
        protein_g=round(total_prot, 1),
        carbs_g=round(total_carb, 1),
        fat_g=round(total_fat, 1),
        fiber_g=round(total_fiber, 1),
    )


def recalculate_from_snapshot(
    item: MealItem,
    new_serving_weight_g: float,
    new_number_of_servings: float,
) -> ComputedNutrients:
    """
    Fallback recalculator when a food entry has been deleted from the catalog.
    Re-derives the per-100g nutrient density from the stored snapshot.
    """
    weight_g = validate_positive_number(new_serving_weight_g, "New serving weight (g)")
    servings = validate_positive_number(new_number_of_servings, "New number of servings")
    old_weight = validate_positive_number(item.total_weight_g, "Original item total weight")

    # Reconstitute approximate per-100g values from historical snapshot
    ratio_to_100g = 100.0 / old_weight
    per_100g = {
        "calories": item.computed_nutrients.calories * ratio_to_100g,
        "protein_g": item.computed_nutrients.protein_g * ratio_to_100g,
        "carbs_g": item.computed_nutrients.carbs_g * ratio_to_100g,
        "fat_g": item.computed_nutrients.fat_g * ratio_to_100g,
        "fiber_g": item.computed_nutrients.fiber_g * ratio_to_100g,
    }

    return calculate_nutrients(
        nutrients_per_100g=per_100g,
        serving_weight_g=weight_g,
        number_of_servings=servings,
    )
