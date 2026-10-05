from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, get_db
from app.core.auth import CurrentUser
from app.core.exceptions import FoodForbiddenError, FoodNotFoundError, InvalidIdError
from app.repositories.food_repository import FoodRepository
from app.schemas.food import (
    FoodCreate,
    FoodResponse,
    FoodSearchResponse,
    FoodUpdate,
)
from app.services.food_service import FoodService

router = APIRouter()


def get_food_service(db=Depends(get_db)) -> FoodService:
    repository = FoodRepository(db)
    return FoodService(repository)


@router.get(
    "/search",
    response_model=FoodSearchResponse,
    summary="Search food catalog",
    description="Search system foods, cached foods, and user-owned custom foods. Never exposes other users' foods.",
)
async def search_foods(
    q: Optional[str] = Query(default=None, description="Search term for food name, brand, or tags"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodService = Depends(get_food_service),
) -> FoodSearchResponse:
    return await service.search_foods(
        query=q,
        current_user=current_user,
        page=page,
        limit=limit,
    )


@router.get(
    "/{food_id}",
    response_model=FoodResponse,
    summary="Get food details by ID",
    description="Retrieve a single food item. System/cached foods are public; custom foods are accessible only to their creator.",
)
async def get_food_by_id(
    food_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodService = Depends(get_food_service),
) -> FoodResponse:
    try:
        return await service.get_food_by_id(food_id=food_id, current_user=current_user)
    except InvalidIdError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except FoodNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "",
    response_model=FoodResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create custom food item",
    description="Create a user-owned custom food item. Strictly bound to the current authenticated user.",
)
async def create_custom_food(
    food_in: FoodCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodService = Depends(get_food_service),
) -> FoodResponse:
    return await service.create_custom_food(food_in=food_in, current_user=current_user)


@router.put(
    "/{food_id}",
    response_model=FoodResponse,
    summary="Update custom food item",
    description="Update an existing custom food. System foods and foods owned by other users cannot be modified.",
)
async def update_custom_food(
    food_id: str,
    food_in: FoodUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodService = Depends(get_food_service),
) -> FoodResponse:
    try:
        return await service.update_custom_food(
            food_id=food_id,
            food_in=food_in,
            current_user=current_user,
        )
    except InvalidIdError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except FoodNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except FoodForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.delete(
    "/{food_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete custom food item",
    description="Delete a custom food item. System foods and foods owned by other users cannot be deleted.",
)
async def delete_custom_food(
    food_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodService = Depends(get_food_service),
) -> None:
    try:
        await service.delete_custom_food(food_id=food_id, current_user=current_user)
    except InvalidIdError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except FoodNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except FoodForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
