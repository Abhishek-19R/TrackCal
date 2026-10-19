import pytest

from app.services.tdee_calculator import (
    ACTIVITY_MULTIPLIERS,
    GOAL_CALORIE_DELTAS,
    MIN_CALORIE_FLOOR_FEMALE,
    MIN_CALORIE_FLOOR_MALE,
    NutritionCalculationError,
    UnderageAdvisoryError,
    calculate_bmr,
    calculate_nutrition_plan,
    calculate_tdee,
    cm_to_feet_inches,
    feet_inches_to_cm,
    kg_to_lbs,
    lbs_to_kg,
)


def test_bmr_male_equation():
    # Male: 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    # For weight=80kg, height=180cm, age=30:
    # 10*80 = 800
    # 6.25*180 = 1125
    # 5*30 = 150
    # 800 + 1125 - 150 + 5 = 1780.0
    bmr = calculate_bmr(weight_kg=80.0, height_cm=180.0, age_years=30, sex="male")
    assert bmr == 1780.0


def test_bmr_female_equation():
    # Female: 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    # For weight=60kg, height=165cm, age=28:
    # 10*60 = 600
    # 6.25*165 = 1031.25
    # 5*28 = 140
    # 600 + 1031.25 - 140 - 161 = 1330.25 -> 1330.2 or 1330.3
    bmr = calculate_bmr(weight_kg=60.0, height_cm=165.0, age_years=28, sex="female")
    assert bmr == 1330.2 or bmr == 1330.3


def test_every_activity_multiplier():
    bmr = 1500.0
    expected_multipliers = {
        "sedentary": 1.20,
        "lightly_active": 1.375,
        "moderately_active": 1.55,
        "very_active": 1.725,
        "extremely_active": 1.90,
    }

    for activity, mult in expected_multipliers.items():
        assert ACTIVITY_MULTIPLIERS[activity] == mult
        tdee = calculate_tdee(bmr, activity)
        assert tdee == round(bmr * mult, 1)


def test_goal_adjustments():
    # Test for an active adult with high enough TDEE that floor is not hit
    plan_maintain = calculate_nutrition_plan(
        weight_kg=75.0,
        height_cm=175.0,
        age_years=25,
        sex="male",
        activity_level="moderately_active",
        goal="maintain",
    )
    plan_gain = calculate_nutrition_plan(
        weight_kg=75.0,
        height_cm=175.0,
        age_years=25,
        sex="male",
        activity_level="moderately_active",
        goal="gain",
    )
    plan_lose = calculate_nutrition_plan(
        weight_kg=75.0,
        height_cm=175.0,
        age_years=25,
        sex="male",
        activity_level="moderately_active",
        goal="lose",
    )

    tdee = plan_maintain["tdee"]
    assert plan_maintain["calorie_target"] == int(round(tdee))
    assert plan_gain["calorie_target"] == int(round(tdee + 300))
    assert plan_lose["calorie_target"] == int(round(tdee - 400))


def test_protein_calculation_and_rounding():
    weight = 75.4
    # Gain -> 2.0 g/kg = 150.8 -> 151.0
    plan_gain = calculate_nutrition_plan(
        weight_kg=weight,
        height_cm=175.0,
        age_years=25,
        sex="male",
        activity_level="moderately_active",
        goal="gain",
    )
    assert plan_gain["protein_target_g"] == round(weight * 2.0, 0)

    # Lose -> 1.8 g/kg = 135.72 -> 136.0
    plan_lose = calculate_nutrition_plan(
        weight_kg=weight,
        height_cm=175.0,
        age_years=25,
        sex="male",
        activity_level="moderately_active",
        goal="lose",
    )
    assert plan_lose["protein_target_g"] == round(weight * 1.8, 0)

    # Maintain -> 1.4 g/kg = 105.56 -> 106.0
    plan_maintain = calculate_nutrition_plan(
        weight_kg=weight,
        height_cm=175.0,
        age_years=25,
        sex="male",
        activity_level="moderately_active",
        goal="maintain",
    )
    assert plan_maintain["protein_target_g"] == round(weight * 1.4, 0)


def test_calorie_safety_floors():
    # Test low weight, short height, sedentary female on "lose"
    plan_female = calculate_nutrition_plan(
        weight_kg=40.0,
        height_cm=145.0,
        age_years=50,
        sex="female",
        activity_level="sedentary",
        goal="lose",
    )
    assert plan_female["calorie_target"] == MIN_CALORIE_FLOOR_FEMALE
    assert plan_female["floor_applied"] is True

    # Test male safety floor
    plan_male = calculate_nutrition_plan(
        weight_kg=45.0,
        height_cm=150.0,
        age_years=60,
        sex="male",
        activity_level="sedentary",
        goal="lose",
    )
    assert plan_male["calorie_target"] == MIN_CALORIE_FLOOR_MALE
    assert plan_male["floor_applied"] is True


def test_unit_conversions():
    # lbs to kg
    assert lbs_to_kg(150.0) == 68.04
    assert lbs_to_kg(220.462) == 100.0

    # kg to lbs
    assert kg_to_lbs(70.0) == 154.3

    # feet/inches to cm
    # 5 feet 10 inches = 70 inches * 2.54 = 177.8 cm
    assert feet_inches_to_cm(5, 10.0) == 177.8
    assert feet_inches_to_cm(6, 0.0) == 182.9

    # cm to feet/inches
    feet, inches = cm_to_feet_inches(177.8)
    assert feet == 5
    assert abs(inches - 10.0) < 0.2


def test_adult_age_restrictions():
    # Minors under 18 must trigger UnderageAdvisoryError
    with pytest.raises(UnderageAdvisoryError) as exc_info:
        calculate_nutrition_plan(
            weight_kg=60.0,
            height_cm=165.0,
            age_years=17,
            sex="female",
            activity_level="moderately_active",
            goal="lose",
        )
    assert "under 18" in str(exc_info.value).lower()


def test_invalid_input_ranges():
    # Weight too low
    with pytest.raises(NutritionCalculationError):
        calculate_nutrition_plan(
            weight_kg=15.0,
            height_cm=170.0,
            age_years=25,
            sex="male",
            activity_level="sedentary",
            goal="maintain",
        )

    # Height too low
    with pytest.raises(NutritionCalculationError):
        calculate_nutrition_plan(
            weight_kg=70.0,
            height_cm=40.0,
            age_years=25,
            sex="male",
            activity_level="sedentary",
            goal="maintain",
        )

    # Age negative
    with pytest.raises(NutritionCalculationError):
        calculate_nutrition_plan(
            weight_kg=70.0,
            height_cm=170.0,
            age_years=0,
            sex="male",
            activity_level="sedentary",
            goal="maintain",
        )

    # Invalid sex
    with pytest.raises(NutritionCalculationError):
        calculate_bmr(weight_kg=70.0, height_cm=170.0, age_years=25, sex="other")
