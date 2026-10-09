from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, get_db
from app.core.auth import CurrentUser
from app.core.exceptions import (
    FoodNotFoundError,
    InvalidDateError,
    InvalidIdError,
    MealItemNotFoundError,
    NutritionCalculationError,
)
from app.repositories.food_repository import FoodRepository
from app.repositories.meal_repository import MealRepository
from app.schemas.meal_log import (
    DailyMealsSummaryResponse,
    MealItemUpdate,
    MealLogCreate,
    MealLogResponse,
)
from app.services.meal_service import MealService

router = APIRouter()


def get_meal_service(db=Depends(get_db)) -> MealService:
    meal_repo = MealRepository(db)
    food_repo = FoodRepository(db)
    return MealService(meal_repo=meal_repo, food_repo=food_repo)


@router.get(
    "/day/{date}",
    response_model=DailyMealsSummaryResponse,
    summary="Get day's meals and nutrition totals",
    description="Retrieve all logged meals and calculated daily nutrient totals for the authenticated user.",
)
async def get_day_meals(
    date: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: MealService = Depends(get_meal_service),
) -> DailyMealsSummaryResponse:
    try:
        return await service.get_day_meals(date=date, current_user=current_user)
    except InvalidDateError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post(
    "/log",
    response_model=MealLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log food items into a meal",
    description="Log one or more food items into a meal category on a specified date. Deterministically calculates nutrition snapshot.",
)
async def log_meal(
    meal_in: MealLogCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: MealService = Depends(get_meal_service),
) -> MealLogResponse:
    try:
        return await service.log_meal(meal_in=meal_in, current_user=current_user)
    except InvalidDateError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except InvalidIdError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except FoodNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except (NutritionCalculationError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.put(
    "/items/{log_item_id}",
    response_model=MealLogResponse,
    summary="Update logged food item",
    description="Update quantity or serving size of an existing logged food item and recalculate totals.",
)
async def update_meal_item(
    log_item_id: str,
    item_in: MealItemUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    service: MealService = Depends(get_meal_service),
) -> MealLogResponse:
    try:
        return await service.update_meal_item(
            log_item_id=log_item_id,
            item_in=item_in,
            current_user=current_user,
        )
    except MealItemNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except (NutritionCalculationError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete(
    "/items/{log_item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete logged food item",
    description="Remove a logged food item from the meal log and recalculate totals.",
)
async def delete_meal_item(
    log_item_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: MealService = Depends(get_meal_service),
) -> None:
    try:
        await service.delete_meal_item(log_item_id=log_item_id, current_user=current_user)
    except MealItemNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
