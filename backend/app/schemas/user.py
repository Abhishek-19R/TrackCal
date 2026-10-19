from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.user_settings import ActivityLevel, GoalType, SexType, UnitSystem, UserSettings


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    username: str
    is_active: bool
    created_at: datetime


class UserProfileSchema(BaseModel):
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    age_years: Optional[int] = None
    sex: Optional[SexType] = None
    activity_level: Optional[ActivityLevel] = None
    goal: Optional[GoalType] = None
    is_onboarding_completed: bool = False


class OnboardingRequest(BaseModel):
    """
    Accepts physical attributes with both metric (cm, kg) and imperial (ft/in, lbs) support.
    Normalizes internally to height_cm and weight_kg.
    """
    height_cm: Optional[float] = Field(default=None, ge=50.0, le=260.0)
    height_ft: Optional[int] = Field(default=None, ge=1, le=8)
    height_in: Optional[float] = Field(default=None, ge=0.0, le=11.9)
    weight_kg: Optional[float] = Field(default=None, ge=20.0, le=500.0)
    weight_lbs: Optional[float] = Field(default=None, ge=44.0, le=1100.0)
    age_years: int = Field(..., ge=1, le=120)
    sex: SexType = Field(..., description="Sex equation to use ('male' or 'female')")
    activity_level: ActivityLevel = Field(..., description="Daily physical activity level")
    goal: GoalType = Field(..., description="Weight goal: maintain, gain, lose")
    unit_system: Optional[UnitSystem] = Field(default="metric")

    @model_validator(mode="after")
    def normalize_units(self) -> "OnboardingRequest":
        # Resolve height to height_cm
        if self.height_cm is None:
            if self.height_ft is not None:
                inches = self.height_in if self.height_in is not None else 0.0
                total_in = (self.height_ft * 12) + inches
                self.height_cm = round(total_in * 2.54, 1)
            else:
                raise ValueError("Must provide either 'height_cm' or 'height_ft'")

        if self.height_cm < 50.0 or self.height_cm > 260.0:
            raise ValueError(f"Height must resolve between 50.0 cm and 260.0 cm (got: {self.height_cm} cm)")

        # Resolve weight to weight_kg
        if self.weight_kg is None:
            if self.weight_lbs is not None:
                self.weight_kg = round(self.weight_lbs * 0.45359237, 2)
            else:
                raise ValueError("Must provide either 'weight_kg' or 'weight_lbs'")

        if self.weight_kg < 20.0 or self.weight_kg > 500.0:
            raise ValueError(f"Weight must resolve between 20.0 kg and 500.0 kg (got: {self.weight_kg} kg)")

        return self


class UserProfileUpdate(BaseModel):
    """
    Update profile metrics directly.
    """
    height_cm: Optional[float] = Field(default=None, ge=50.0, le=260.0)
    weight_kg: Optional[float] = Field(default=None, ge=20.0, le=500.0)
    age_years: Optional[int] = Field(default=None, ge=1, le=120)
    sex: Optional[SexType] = None
    activity_level: Optional[ActivityLevel] = None
    goal: Optional[GoalType] = None
    unit_system: Optional[UnitSystem] = None


class CustomTargetsUpdate(BaseModel):
    """
    Manual override of daily targets by the user.
    """
    calorie_target: Optional[int] = Field(default=None, ge=500, le=15000)
    protein_target_g: Optional[float] = Field(default=None, ge=0.0, le=1000.0)
    carb_target_g: Optional[float] = Field(default=None, ge=0.0, le=1500.0)
    fat_target_g: Optional[float] = Field(default=None, ge=0.0, le=500.0)
    water_target_ml: Optional[int] = Field(default=None, ge=0, le=20000)
    unit_system: Optional[UnitSystem] = None


UserSettingsUpdate = CustomTargetsUpdate


class NutritionPlanPreview(BaseModel):
    bmr: float
    tdee: float
    calorie_target: int
    protein_target_g: float
    carb_target_g: float
    fat_target_g: float
    water_target_ml: int
    goal: str
    activity_level: str
    floor_applied: bool
    disclaimer: str


class UserSettingsResponse(BaseModel):
    id: str
    user_id: str
    profile: UserProfileSchema
    bmr_estimate: Optional[float] = None
    tdee_estimate: Optional[float] = None
    is_custom_override: bool
    calorie_target: int
    protein_target_g: float
    carb_target_g: float
    fat_target_g: float
    water_target_ml: int
    unit_system: str
    updated_at: datetime

    @classmethod
    def from_user_settings(cls, settings: UserSettings) -> "UserSettingsResponse":
        return cls(
            id=str(settings.id) if settings.id else "",
            user_id=str(settings.user_id),
            profile=UserProfileSchema(
                height_cm=settings.profile.height_cm,
                weight_kg=settings.profile.weight_kg,
                age_years=settings.profile.age_years,
                sex=settings.profile.sex,
                activity_level=settings.profile.activity_level,
                goal=settings.profile.goal,
                is_onboarding_completed=settings.profile.is_onboarding_completed,
            ),
            bmr_estimate=settings.bmr_estimate,
            tdee_estimate=settings.tdee_estimate,
            is_custom_override=settings.is_custom_override,
            calorie_target=settings.calorie_target,
            protein_target_g=settings.protein_target_g,
            carb_target_g=settings.carb_target_g,
            fat_target_g=settings.fat_target_g,
            water_target_ml=settings.water_target_ml,
            unit_system=settings.unit_system,
            updated_at=settings.updated_at,
        )
