from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, get_db
from app.core.auth import CurrentUser
from app.core.exceptions import (
    InvalidDateError,
    InvalidIdError,
    WeightNotFoundError,
)
from app.repositories.weight_repository import WeightRepository
from app.schemas.weight_log import WeightLogCreate, WeightLogResponse
from app.services.weight_service import WeightService

router = APIRouter()


def get_weight_service(db=Depends(get_db)) -> WeightService:
    weight_repo = WeightRepository(db)
    return WeightService(weight_repo=weight_repo)


@router.get(
    "",
    response_model=List[WeightLogResponse],
    summary="List weight history",
    description="Retrieve chronological body weight logs for the authenticated user, optionally filtered by date range.",
)
async def list_weights(
    start_date: Optional[str] = Query(default=None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date filter (YYYY-MM-DD)"),
    current_user: CurrentUser = Depends(get_current_user),
    service: WeightService = Depends(get_weight_service),
) -> List[WeightLogResponse]:
    try:
        return await service.list_weights(
            current_user=current_user,
            start_date=start_date,
            end_date=end_date,
        )
    except (InvalidDateError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post(
    "",
    response_model=WeightLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record or update weight entry",
    description="Log body weight for a given date. Automatically normalizes lbs to kg and updates if an entry exists for that date.",
)
async def log_weight(
    weight_in: WeightLogCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: WeightService = Depends(get_weight_service),
) -> WeightLogResponse:
    try:
        return await service.log_weight(weight_in=weight_in, current_user=current_user)
    except (InvalidDateError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete(
    "/{weight_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete weight entry",
    description="Remove a body weight log entry strictly owned by the current user.",
)
async def delete_weight(
    weight_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: WeightService = Depends(get_weight_service),
) -> None:
    try:
        await service.delete_weight(weight_id=weight_id, current_user=current_user)
    except InvalidIdError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except WeightNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
