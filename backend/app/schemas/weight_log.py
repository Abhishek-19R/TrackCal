from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class WeightLogCreate(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Date string YYYY-MM-DD")
    weight_kg: float = Field(..., gt=20.0, lt=500.0)
    note: Optional[str] = Field(default=None, max_length=200)


class WeightLogResponse(BaseModel):
    id: str
    user_id: str
    date: str
    weight_kg: float
    note: Optional[str]
    created_at: datetime
