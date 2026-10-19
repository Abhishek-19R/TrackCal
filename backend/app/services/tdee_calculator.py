"""
NutriTrack Deterministic TDEE & Nutrition Calculation Engine.

Implements the Mifflin–St Jeor equation and standard sports nutrition guidelines.
This module is strictly deterministic, offline, and independent of any AI dependency.
"""

from typing import Dict, Literal, Optional, Tuple

ActivityLevel = Literal[
    "sedentary",
    "lightly_active",
    "moderately_active",
    "very_active",
    "extremely_active",
]

GoalType = Literal["maintain", "gain", "lose"]
SexType = Literal["male", "female"]

# Activity multipliers for TDEE estimation
ACTIVITY_MULTIPLIERS: Dict[ActivityLevel, float] = {
    "sedentary": 1.20,         # Little or no exercise, desk job
    "lightly_active": 1.375,    # Light exercise 1-3 days/week
    "moderately_active": 1.55,  # Moderate exercise 3-5 days/week
    "very_active": 1.725,       # Hard exercise 6-7 days/week
    "extremely_active": 1.90,   # Very hard daily exercise or physical job
}

# Caloric goal adjustments
GOAL_CALORIE_DELTAS: Dict[GoalType, int] = {
    "maintain": 0,
    "gain": 300,    # Conservative lean surplus (+250 to +300 kcal/day)
    "lose": -400,   # Conservative moderate deficit (-250 to -500 kcal/day)
}

# Protein guidelines (grams per kilogram of body weight per day)
# - Muscle gain: 1.6 - 2.2 g/kg (default: 2.0 g/kg for active resistance training)
# - Weight loss: 1.6 - 2.0 g/kg (default: 1.8 g/kg to preserve lean body mass in a deficit)
# - Maintenance: 1.2 - 1.6 g/kg (default: 1.4 g/kg for general active health)
PROTEIN_MULTIPLIERS: Dict[GoalType, float] = {
    "gain": 2.0,
    "lose": 1.8,
    "maintain": 1.4,
}

# Calorie safety floors to prevent unsafe crash dieting
MIN_CALORIE_FLOOR_MALE = 1500
MIN_CALORIE_FLOOR_FEMALE = 1200


class NutritionCalculationError(ValueError):
    """Raised when calculation inputs are outside plausible biological ranges."""
    pass


class UnderageAdvisoryError(ValueError):
    """Raised when adult prescriptive calorie deficit/surplus formulas are applied to minors."""
    pass


def lbs_to_kg(lbs: float) -> float:
    """Convert pounds to kilograms rounded to 2 decimal places."""
    if lbs <= 0:
        raise NutritionCalculationError("Weight must be a positive number")
    return round(lbs * 0.45359237, 2)


def kg_to_lbs(kg: float) -> float:
    """Convert kilograms to pounds rounded to 1 decimal place."""
    if kg <= 0:
        raise NutritionCalculationError("Weight must be a positive number")
    return round(kg * 2.20462262, 1)


def feet_inches_to_cm(feet: int, inches: float = 0.0) -> float:
    """Convert feet and inches to centimeters rounded to 1 decimal place."""
    if feet < 0 or inches < 0 or (feet == 0 and inches <= 0):
        raise NutritionCalculationError("Height must be a positive value")
    total_inches = (feet * 12) + inches
    return round(total_inches * 2.54, 1)


def cm_to_feet_inches(cm: float) -> Tuple[int, float]:
    """Convert centimeters to (feet, inches) with inches rounded to 1 decimal place."""
    if cm <= 0:
        raise NutritionCalculationError("Height must be a positive value")
    total_inches = cm / 2.54
    feet = int(total_inches // 12)
    inches = round(total_inches % 12, 1)
    if inches == 12.0:
        feet += 1
        inches = 0.0
    return feet, inches


def validate_profile_inputs(
    weight_kg: float,
    height_cm: float,
    age_years: int,
    sex: str,
    activity_level: str,
    goal: str,
) -> None:
    """Validate that inputs fall within plausible physiological bounds."""
    if age_years < 1:
        raise NutritionCalculationError(f"Age must be at least 1 year (received: {age_years})")
    if age_years > 120:
        raise NutritionCalculationError(f"Age cannot exceed 120 years (received: {age_years})")
    if age_years < 18:
        raise UnderageAdvisoryError(
            "Users under 18 require pediatric nutritional oversight. Adult formulas should not be prescribed."
        )

    if weight_kg < 20.0 or weight_kg > 500.0:
        raise NutritionCalculationError(
            f"Weight must be between 20.0 kg and 500.0 kg (received: {weight_kg} kg)"
        )

    if height_cm < 50.0 or height_cm > 260.0:
        raise NutritionCalculationError(
            f"Height must be between 50.0 cm and 260.0 cm (received: {height_cm} cm)"
        )

    if sex not in ("male", "female"):
        raise NutritionCalculationError(f"Sex must be 'male' or 'female' (received: {sex})")

    if activity_level not in ACTIVITY_MULTIPLIERS:
        raise NutritionCalculationError(
            f"Invalid activity level: '{activity_level}'. Allowed: {list(ACTIVITY_MULTIPLIERS.keys())}"
        )

    if goal not in GOAL_CALORIE_DELTAS:
        raise NutritionCalculationError(
            f"Invalid goal: '{goal}'. Allowed: {list(GOAL_CALORIE_DELTAS.keys())}"
        )


def calculate_bmr(
    weight_kg: float,
    height_cm: float,
    age_years: int,
    sex: SexType,
) -> float:
    """
    Calculate Basal Metabolic Rate using the Mifflin–St Jeor equation.

    Male equation:
        BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age_years + 5
    Female equation:
        BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age_years - 161
    """
    base = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age_years)
    if sex == "male":
        return round(base + 5.0, 1)
    elif sex == "female":
        return round(base - 161.0, 1)
    else:
        raise NutritionCalculationError(f"Unsupported sex: {sex}")


def calculate_tdee(bmr: float, activity_level: ActivityLevel) -> float:
    """
    Calculate Total Daily Energy Expenditure (TDEE / maintenance calories)
    by multiplying BMR by the validated activity factor.
    """
    if activity_level not in ACTIVITY_MULTIPLIERS:
        raise NutritionCalculationError(f"Unknown activity level: {activity_level}")
    multiplier = ACTIVITY_MULTIPLIERS[activity_level]
    return round(bmr * multiplier, 1)


def calculate_nutrition_plan(
    weight_kg: float,
    height_cm: float,
    age_years: int,
    sex: SexType,
    activity_level: ActivityLevel,
    goal: GoalType,
    custom_calorie_delta: Optional[int] = None,
    custom_protein_per_kg: Optional[float] = None,
) -> Dict[str, object]:
    """
    Computes complete nutrition estimate:
    - BMR & TDEE
    - Recommended daily calories with goal adjustment & safety floors
    - Macronutrient targets (protein, carbs, fat) with documented split
    """
    validate_profile_inputs(
        weight_kg=weight_kg,
        height_cm=height_cm,
        age_years=age_years,
        sex=sex,
        activity_level=activity_level,
        goal=goal,
    )

    bmr = calculate_bmr(weight_kg, height_cm, age_years, sex)
    tdee = calculate_tdee(bmr, activity_level)

    # Goal adjustment
    delta = custom_calorie_delta if custom_calorie_delta is not None else GOAL_CALORIE_DELTAS[goal]
    raw_calories = tdee + delta

    # Apply physiological safety floor
    floor = MIN_CALORIE_FLOOR_MALE if sex == "male" else MIN_CALORIE_FLOOR_FEMALE
    target_calories = max(int(round(raw_calories)), floor)
    floor_applied = target_calories > int(round(raw_calories))

    # Protein calculation
    protein_multiplier = (
        custom_protein_per_kg if custom_protein_per_kg is not None else PROTEIN_MULTIPLIERS[goal]
    )
    protein_g = round(weight_kg * protein_multiplier, 0)
    protein_calories = protein_g * 4.0

    # Dietary Fat: ~25% of target calories, with a minimum of 0.7 g/kg for essential fats
    min_fat_g = round(weight_kg * 0.7, 0)
    target_fat_calories = target_calories * 0.25
    fat_g = max(round(target_fat_calories / 9.0, 0), min_fat_g)
    fat_calories = fat_g * 9.0

    # Carbohydrates: remaining calories
    remaining_calories = max(0.0, target_calories - protein_calories - fat_calories)
    carb_g = round(remaining_calories / 4.0, 0)

    # Water recommendation: standard baseline (~35 ml per kg of body weight, rounded to 100ml)
    water_ml = int(round((weight_kg * 35.0) / 100.0) * 100)
    water_ml = max(2000, min(water_ml, 5000))

    return {
        "bmr": round(bmr, 0),
        "tdee": round(tdee, 0),
        "calorie_target": int(target_calories),
        "protein_target_g": float(protein_g),
        "carb_target_g": float(carb_g),
        "fat_target_g": float(fat_g),
        "water_target_ml": int(water_ml),
        "goal": goal,
        "activity_level": activity_level,
        "floor_applied": floor_applied,
        "disclaimer": (
            "Estimates calculated via the Mifflin–St Jeor equation. "
            "Individual metabolic rates vary. Adjust based on weekly weigh-in trends. "
            "Consult a physician or registered dietitian for specialized medical conditions."
        ),
    }
