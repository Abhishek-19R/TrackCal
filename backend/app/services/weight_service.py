from datetime import datetime
import re
from typing import List, Optional
from bson import ObjectId

from app.core.auth import CurrentUser
from app.core.exceptions import (
    InvalidDateError,
    InvalidIdError,
    WeightNotFoundError,
)
from app.models.weight_log import WeightLog
from app.repositories.weight_repository import WeightRepository
from app.schemas.weight_log import (
    WeightLogCreate,
    WeightLogResponse,
)


class WeightService:
    """
    Business logic layer for Weight Tracking domain.
    Enforces user isolation, unit normalization, date validation, and upsert handling.
    """

    def __init__(self, weight_repo: WeightRepository):
        self.weight_repo = weight_repo

    def _validate_date(self, date_str: str) -> str:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
            raise InvalidDateError(f"Date '{date_str}' is not in valid YYYY-MM-DD format")
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            raise InvalidDateError(f"Date '{date_str}' is not a valid calendar date")
        return date_str

    def _parse_object_id(self, id_str: str) -> ObjectId:
        if not ObjectId.is_valid(id_str):
            raise InvalidIdError(f"Invalid weight ID format: '{id_str}'")
        return ObjectId(id_str)

    async def list_weights(
        self,
        current_user: CurrentUser,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[WeightLogResponse]:
        """
        List the current user's recorded weights, optionally filtered by date range.
        Returns entries ordered descending (most recent first).
        """
        valid_start = self._validate_date(start_date) if start_date else None
        valid_end = self._validate_date(end_date) if end_date else None

        if valid_start and valid_end and valid_start > valid_end:
            raise ValueError("start_date cannot be greater than end_date")

        logs = await self.weight_repo.list_by_user(
            user_id=current_user.id,
            start_date=valid_start,
            end_date=valid_end,
        )
        return [WeightLogResponse.from_weight_log(w) for w in logs]

    async def log_weight(
        self,
        weight_in: WeightLogCreate,
        current_user: CurrentUser,
    ) -> WeightLogResponse:
        """
        Record a body weight entry for a specific date.
        If an entry already exists for that user and date, updates the record (upsert).
        """
        valid_date = self._validate_date(weight_in.date)

        log = WeightLog(
            user_id=current_user.id,
            date=valid_date,
            weight_kg=weight_in.weight_kg,
            note=weight_in.note,
        )
        saved_log, _ = await self.weight_repo.upsert(log)
        return WeightLogResponse.from_weight_log(saved_log)

    async def delete_weight(
        self,
        weight_id: str,
        current_user: CurrentUser,
    ) -> None:
        """
        Delete a weight entry strictly owned by the current user.
        """
        oid = self._parse_object_id(weight_id)
        deleted = await self.weight_repo.delete(oid, current_user.id)
        if not deleted:
            raise WeightNotFoundError(f"Weight record with ID '{weight_id}' not found")
