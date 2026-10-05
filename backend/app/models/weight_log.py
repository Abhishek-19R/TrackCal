import re
from datetime import datetime
from typing import Optional
from pydantic import Field, field_validator
from app.models.common import MongoBaseModel, PyObjectId, utc_now


class WeightLog(MongoBaseModel):
    """
    Body weight log entry.
    Strictly user-scoped via user_id. One primary entry per user per day.
    """
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: PyObjectId = Field(..., description="Owning user ID")
    date: str = Field(..., description="Date string in YYYY-MM-DD format")
    weight_kg: float = Field(..., gt=20.0, lt=500.0, description="Weight in kilograms")
    note: Optional[str] = Field(default=None, max_length=200, description="Optional note (e.g., fasted, morning)")
    created_at: datetime = Field(default_factory=utc_now)

    @field_validator("date")
    @classmethod
    def validate_iso_date(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("Date must be formatted as YYYY-MM-DD")
        return v
