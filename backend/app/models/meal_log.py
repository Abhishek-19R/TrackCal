import re
import uuid
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import Field, field_validator
from app.models.common import AuditedMongoModel, MongoBaseModel, PyObjectId, utc_now


class ComputedNutrients(MongoBaseModel):
    calories: float = Field(..., ge=0.0)
    protein_g: float = Field(..., ge=0.0)
    carbs_g: float = Field(..., ge=0.0)
    fat_g: float = Field(..., ge=0.0)
    fiber_g: float = Field(default=0.0, ge=0.0)


class SelectedServing(MongoBaseModel):
    description: str
    weight_g: float = Field(..., gt=0.0)


class MealItem(MongoBaseModel):
    log_item_id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:12]}")
    food_id: PyObjectId
    food_name: str
    serving_selected: SelectedServing
    number_of_servings: float = Field(..., gt=0.0, description="e.g. 1.0, 0.5, 2.0")
    total_weight_g: float = Field(..., gt=0.0, description="weight_g * number_of_servings")
    computed_nutrients: ComputedNutrients
    logged_at: datetime = Field(default_factory=utc_now)


class MealLog(AuditedMongoModel):
    """
    Log of foods consumed within a specific meal category on a specific date.
    Strictly user-scoped via user_id.
    """
    user_id: PyObjectId = Field(..., description="Owning user ID")
    date: str = Field(..., description="Date string in YYYY-MM-DD format")
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] = Field(...)
    items: List[MealItem] = Field(default_factory=list)
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("date")
    @classmethod
    def validate_iso_date(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("Date must be formatted as YYYY-MM-DD")
        return v

    def calculate_total_nutrients(self) -> ComputedNutrients:
        """Helper to calculate aggregated nutrient totals for this meal."""
        cals = sum(item.computed_nutrients.calories for item in self.items)
        prot = sum(item.computed_nutrients.protein_g for item in self.items)
        carb = sum(item.computed_nutrients.carbs_g for item in self.items)
        fat = sum(item.computed_nutrients.fat_g for item in self.items)
        fib = sum(item.computed_nutrients.fiber_g for item in self.items)
        return ComputedNutrients(
            calories=round(cals, 1),
            protein_g=round(prot, 1),
            carbs_g=round(carb, 1),
            fat_g=round(fat, 1),
            fiber_g=round(fib, 1),
        )
