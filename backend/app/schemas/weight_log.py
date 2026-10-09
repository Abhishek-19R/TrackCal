from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, model_validator

from app.models.weight_log import WeightLog


class WeightLogCreate(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Date string YYYY-MM-DD")
    weight_kg: Optional[float] = Field(default=None, description="Weight in kilograms (20.0 - 500.0)")
    weight: Optional[float] = Field(default=None, description="Weight value if using explicit unit")
    unit: Optional[Literal["kg", "lbs"]] = Field(default="kg", description="Unit of weight, default 'kg'")
    note: Optional[str] = Field(default=None, max_length=200, description="Optional note")

    @model_validator(mode="after")
    def normalize_and_validate_weight(self) -> "WeightLogCreate":
        resolved_kg: Optional[float] = None

        if self.weight_kg is not None:
            resolved_kg = round(self.weight_kg, 2)
        elif self.weight is not None:
            if self.unit == "lbs":
                resolved_kg = round(self.weight * 0.45359237, 2)
            else:
                resolved_kg = round(self.weight, 2)
        else:
            raise ValueError("Must provide either 'weight_kg' or 'weight'")

        if resolved_kg < 20.0 or resolved_kg > 500.0:
            raise ValueError(
                f"Weight must be between 20.0 kg and 500.0 kg (or equivalent lbs). Resolved: {resolved_kg} kg"
            )

        self.weight_kg = resolved_kg
        return self


class WeightLogResponse(BaseModel):
    id: str
    user_id: str
    date: str
    weight_kg: float
    unit: str = "kg"
    note: Optional[str] = None
    created_at: datetime

    @classmethod
    def from_weight_log(cls, weight: WeightLog) -> "WeightLogResponse":
        return cls(
            id=str(weight.id) if weight.id else "",
            user_id=str(weight.user_id),
            date=weight.date,
            weight_kg=weight.weight_kg,
            unit="kg",
            note=weight.note,
            created_at=weight.created_at,
        )


class WeightHistoryResponse(BaseModel):
    items: List[WeightLogResponse]
    total: int
