from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, get_db
from app.core.auth import CurrentUser
from app.repositories.user_settings_repository import UserSettingsRepository
from app.repositories.weight_repository import WeightRepository
from app.schemas.user import (
    CustomTargetsUpdate,
    NutritionPlanPreview,
    OnboardingRequest,
    UserProfileUpdate,
    UserSettingsResponse,
)
from app.services.tdee_calculator import (
    NutritionCalculationError,
    UnderageAdvisoryError,
)
from app.services.user_settings_service import UserSettingsService

router = APIRouter()


def get_user_settings_service(db=Depends(get_db)) -> UserSettingsService:
    settings_repo = UserSettingsRepository(db)
    weight_repo = WeightRepository(db)
    return UserSettingsService(settings_repo=settings_repo, weight_repo=weight_repo)


@router.get(
    "/settings",
    response_model=UserSettingsResponse,
    summary="Get user settings and profile",
    description="Retrieve daily nutrition targets, onboarding status, and profile metrics for current user.",
)
async def get_settings(
    current_user: CurrentUser = Depends(get_current_user),
    service: UserSettingsService = Depends(get_user_settings_service),
) -> UserSettingsResponse:
    settings = await service.get_or_create_settings(current_user)
    return UserSettingsResponse.from_user_settings(settings)


@router.post(
    "/onboarding",
    response_model=UserSettingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Complete first-time onboarding",
    description="Process user physical attributes, calculate estimated BMR/TDEE & targets, and mark onboarding complete.",
)
async def complete_onboarding(
    req: OnboardingRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: UserSettingsService = Depends(get_user_settings_service),
) -> UserSettingsResponse:
    try:
        settings = await service.complete_onboarding(current_user=current_user, req=req)
        return UserSettingsResponse.from_user_settings(settings)
    except (UnderageAdvisoryError, NutritionCalculationError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.put(
    "/profile",
    response_model=UserSettingsResponse,
    summary="Update profile metrics",
    description="Update height, weight, activity or goal. Automatically recalculates targets if not manually overridden.",
)
async def update_profile(
    update: UserProfileUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    service: UserSettingsService = Depends(get_user_settings_service),
) -> UserSettingsResponse:
    try:
        settings = await service.update_profile(current_user=current_user, update=update)
        return UserSettingsResponse.from_user_settings(settings)
    except (UnderageAdvisoryError, NutritionCalculationError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.put(
    "/targets",
    response_model=UserSettingsResponse,
    summary="Manual targets override",
    description="Explicitly set custom daily calories and macronutrient targets. Flags is_custom_override as true.",
)
async def update_custom_targets(
    targets_in: CustomTargetsUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    service: UserSettingsService = Depends(get_user_settings_service),
) -> UserSettingsResponse:
    settings = await service.update_custom_targets(current_user=current_user, targets_in=targets_in)
    return UserSettingsResponse.from_user_settings(settings)


@router.post(
    "/recalculate-targets",
    response_model=UserSettingsResponse,
    summary="Recalculate targets from profile",
    description="Clears manual override and resets targets to the Mifflin-St Jeor recommendation based on current profile.",
)
async def recalculate_targets(
    current_user: CurrentUser = Depends(get_current_user),
    service: UserSettingsService = Depends(get_user_settings_service),
) -> UserSettingsResponse:
    try:
        settings = await service.recalculate_from_profile(current_user)
        return UserSettingsResponse.from_user_settings(settings)
    except (UnderageAdvisoryError, NutritionCalculationError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post(
    "/calculate-preview",
    response_model=NutritionPlanPreview,
    summary="Preview nutrition calculations",
    description="Calculates estimated BMR, TDEE, calories, and macros for given inputs without saving to database.",
)
async def calculate_preview(
    req: OnboardingRequest,
    service: UserSettingsService = Depends(get_user_settings_service),
) -> NutritionPlanPreview:
    try:
        return service.preview_plan(req)
    except (UnderageAdvisoryError, NutritionCalculationError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
