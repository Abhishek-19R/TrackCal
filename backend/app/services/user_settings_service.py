from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from app.core.auth import CurrentUser
from app.models.user_settings import UserProfile, UserSettings
from app.models.weight_log import WeightLog
from app.repositories.user_settings_repository import UserSettingsRepository
from app.repositories.weight_repository import WeightRepository
from app.schemas.user import (
    CustomTargetsUpdate,
    NutritionPlanPreview,
    OnboardingRequest,
    UserProfileUpdate,
)
from app.services.tdee_calculator import (
    calculate_nutrition_plan,
)


class UserSettingsService:
    """
    Business logic for user onboarding, profile metric management,
    deterministic TDEE calculations, and manual target overrides.
    """

    def __init__(
        self,
        settings_repo: UserSettingsRepository,
        weight_repo: Optional[WeightRepository] = None,
    ):
        self.settings_repo = settings_repo
        self.weight_repo = weight_repo

    async def get_or_create_settings(self, current_user: CurrentUser) -> UserSettings:
        """Retrieve user settings or initialize default settings document."""
        settings = await self.settings_repo.get_by_user_id(current_user.id)
        if settings is None:
            settings = UserSettings(user_id=current_user.id)
            settings = await self.settings_repo.save(settings)
        return settings

    async def complete_onboarding(
        self, current_user: CurrentUser, req: OnboardingRequest
    ) -> UserSettings:
        """
        Process first-time onboarding:
        - Compute deterministic BMR, TDEE, recommended calories & protein
        - Update profile and mark onboarding completed
        - Reset custom override to False (using recommended targets)
        - Record initial weigh-in to weight tracker
        """
        settings = await self.get_or_create_settings(current_user)

        # Calculate plan
        plan = calculate_nutrition_plan(
            weight_kg=req.weight_kg,  # normalized by schema validator
            height_cm=req.height_cm,  # normalized by schema validator
            age_years=req.age_years,
            sex=req.sex,
            activity_level=req.activity_level,
            goal=req.goal,
        )

        # Update profile
        settings.profile = UserProfile(
            height_cm=req.height_cm,
            weight_kg=req.weight_kg,
            age_years=req.age_years,
            sex=req.sex,
            activity_level=req.activity_level,
            goal=req.goal,
            is_onboarding_completed=True,
        )

        # Set calculated targets and estimates
        settings.bmr_estimate = float(plan["bmr"])
        settings.tdee_estimate = float(plan["tdee"])
        settings.calorie_target = int(plan["calorie_target"])
        settings.protein_target_g = float(plan["protein_target_g"])
        settings.carb_target_g = float(plan["carb_target_g"])
        settings.fat_target_g = float(plan["fat_target_g"])
        settings.water_target_ml = int(plan["water_target_ml"])
        settings.is_custom_override = False

        if req.unit_system:
            settings.unit_system = req.unit_system

        saved_settings = await self.settings_repo.save(settings)

        # Record initial baseline weight into weight tracker if repo available
        if self.weight_repo is not None and req.weight_kg is not None:
            today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            existing_weight = await self.weight_repo.get_by_user_and_date(
                current_user.id, today_iso
            )
            if existing_weight is None:
                new_weight = WeightLog(
                    id=ObjectId(),
                    user_id=current_user.id,
                    date=today_iso,
                    weight_kg=req.weight_kg,
                    note="Initial baseline from onboarding",
                )
                await self.weight_repo.upsert(new_weight)

        return saved_settings

    async def update_profile(
        self,
        current_user: CurrentUser,
        update: UserProfileUpdate,
        force_recalculate: bool = False,
    ) -> UserSettings:
        """
        Update user physical attributes and lifestyle variables.
        If inputs are sufficient, recalculates BMR & TDEE.
        Targets are automatically updated UNLESS is_custom_override is True
        (or force_recalculate=True is explicitly requested).
        """
        settings = await self.get_or_create_settings(current_user)

        # Merge fields
        if update.height_cm is not None:
            settings.profile.height_cm = update.height_cm
        if update.weight_kg is not None:
            settings.profile.weight_kg = update.weight_kg
        if update.age_years is not None:
            settings.profile.age_years = update.age_years
        if update.sex is not None:
            settings.profile.sex = update.sex
        if update.activity_level is not None:
            settings.profile.activity_level = update.activity_level
        if update.goal is not None:
            settings.profile.goal = update.goal
        if update.unit_system is not None:
            settings.unit_system = update.unit_system

        # Check if complete profile exists for recalculation
        p = settings.profile
        if (
            p.weight_kg is not None
            and p.height_cm is not None
            and p.age_years is not None
            and p.sex is not None
            and p.activity_level is not None
            and p.goal is not None
        ):
            plan = calculate_nutrition_plan(
                weight_kg=p.weight_kg,
                height_cm=p.height_cm,
                age_years=p.age_years,
                sex=p.sex,
                activity_level=p.activity_level,
                goal=p.goal,
            )
            settings.bmr_estimate = float(plan["bmr"])
            settings.tdee_estimate = float(plan["tdee"])

            # Only overwrite active targets if user hasn't overridden them, or forced
            if (not settings.is_custom_override) or force_recalculate:
                settings.calorie_target = int(plan["calorie_target"])
                settings.protein_target_g = float(plan["protein_target_g"])
                settings.carb_target_g = float(plan["carb_target_g"])
                settings.fat_target_g = float(plan["fat_target_g"])
                settings.water_target_ml = int(plan["water_target_ml"])
                settings.is_custom_override = False

        return await self.settings_repo.save(settings)

    async def update_custom_targets(
        self, current_user: CurrentUser, targets_in: CustomTargetsUpdate
    ) -> UserSettings:
        """
        Set explicit manual targets. Marks is_custom_override = True.
        """
        settings = await self.get_or_create_settings(current_user)

        if targets_in.calorie_target is not None:
            settings.calorie_target = targets_in.calorie_target
        if targets_in.protein_target_g is not None:
            settings.protein_target_g = targets_in.protein_target_g
        if targets_in.carb_target_g is not None:
            settings.carb_target_g = targets_in.carb_target_g
        if targets_in.fat_target_g is not None:
            settings.fat_target_g = targets_in.fat_target_g
        if targets_in.water_target_ml is not None:
            settings.water_target_ml = targets_in.water_target_ml
        if targets_in.unit_system is not None:
            settings.unit_system = targets_in.unit_system

        settings.is_custom_override = True
        return await self.settings_repo.save(settings)

    async def recalculate_from_profile(self, current_user: CurrentUser) -> UserSettings:
        """
        Force recalculation from saved profile metrics, clearing custom override.
        """
        return await self.update_profile(
            current_user=current_user,
            update=UserProfileUpdate(),
            force_recalculate=True,
        )

    def preview_plan(self, req: OnboardingRequest) -> NutritionPlanPreview:
        """
        Calculate plan estimates without saving.
        """
        plan = calculate_nutrition_plan(
            weight_kg=req.weight_kg,
            height_cm=req.height_cm,
            age_years=req.age_years,
            sex=req.sex,
            activity_level=req.activity_level,
            goal=req.goal,
        )
        return NutritionPlanPreview(
            bmr=float(plan["bmr"]),
            tdee=float(plan["tdee"]),
            calorie_target=int(plan["calorie_target"]),
            protein_target_g=float(plan["protein_target_g"]),
            carb_target_g=float(plan["carb_target_g"]),
            fat_target_g=float(plan["fat_target_g"]),
            water_target_ml=int(plan["water_target_ml"]),
            goal=str(plan["goal"]),
            activity_level=str(plan["activity_level"]),
            floor_applied=bool(plan["floor_applied"]),
            disclaimer=str(plan["disclaimer"]),
        )
