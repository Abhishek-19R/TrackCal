from typing import Literal, Optional
from pydantic import Field
from app.models.common import AuditedMongoModel, MongoBaseModel, PyObjectId

ActivityLevel = Literal[
    "sedentary",
    "lightly_active",
    "moderately_active",
    "very_active",
    "extremely_active",
]
GoalType = Literal["maintain", "gain", "lose"]
SexType = Literal["male", "female"]
UnitSystem = Literal["metric", "imperial"]


class UserProfile(MongoBaseModel):
    """
    Physical attributes and lifestyle variables for calculating BMR & TDEE.
    """
    height_cm: Optional[float] = Field(default=None, ge=50.0, le=260.0, description="Height in centimeters")
    weight_kg: Optional[float] = Field(default=None, ge=20.0, le=500.0, description="Current body weight in kilograms")
    age_years: Optional[int] = Field(default=None, ge=1, le=120, description="Age in years")
    sex: Optional[SexType] = Field(default=None, description="Sex for Mifflin-St Jeor formula ('male' or 'female')")
    activity_level: Optional[ActivityLevel] = Field(default=None, description="Activity multiplier level")
    goal: Optional[GoalType] = Field(default=None, description="Primary goal: maintain, gain, lose")
    is_onboarding_completed: bool = Field(default=False, description="Whether the onboarding survey has been finished")


class UserSettings(AuditedMongoModel):
    """
    User-specific nutrition goals, profile metrics, and display preferences.
    Security Notice: AI credentials are NEVER stored on the server or in MongoDB;
    they remain exclusively on the user's local device.
    """
    user_id: PyObjectId = Field(..., description="ID of the owning user")
    profile: UserProfile = Field(default_factory=UserProfile, description="Physical traits and onboarding state")

    # Estimated metabolism metrics
    bmr_estimate: Optional[float] = Field(default=None, description="Estimated Basal Metabolic Rate (kcal)")
    tdee_estimate: Optional[float] = Field(default=None, description="Estimated Total Daily Energy Expenditure (kcal)")

    # Macro & Caloric Targets
    is_custom_override: bool = Field(
        default=False,
        description="True if user manually entered targets overriding calculated formula",
    )
    calorie_target: int = Field(default=2000, ge=500, le=15000, description="Daily calorie target (kcal)")
    protein_target_g: float = Field(default=150.0, ge=0.0, le=1000.0, description="Daily protein target in grams")
    carb_target_g: float = Field(default=200.0, ge=0.0, le=1500.0, description="Daily carbohydrates target in grams")
    fat_target_g: float = Field(default=65.0, ge=0.0, le=500.0, description="Daily fat target in grams")
    water_target_ml: int = Field(default=2500, ge=0, le=20000, description="Daily water intake target (ml)")
    unit_system: UnitSystem = Field(default="metric", description="Preferred unit system")
