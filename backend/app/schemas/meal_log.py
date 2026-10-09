from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, model_validator

from app.models.meal_log import ComputedNutrients, MealItem, MealLog, SelectedServing


class MealItemAdd(BaseModel):
    food_id: str = Field(..., description="ID of the food item in the catalog")
    serving_id: Optional[str] = Field(default=None, description="Optional serving_id from food serving options")
    serving_selected: Optional[SelectedServing] = Field(
        default=None, description="Explicit serving specification (description and weight_g)"
    )
    number_of_servings: float = Field(default=1.0, gt=0.0, description="Quantity/multiplier of selected serving")


class MealLogCreate(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Date string YYYY-MM-DD")
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] = Field(
        ..., description="Meal category"
    )
    items: Optional[List[MealItemAdd]] = Field(
        default=None, description="One or more food items to log"
    )
    # Convenience single-item logging fields
    food_id: Optional[str] = Field(default=None, description="Single item food ID shortcut")
    serving_id: Optional[str] = Field(default=None, description="Single item serving ID shortcut")
    serving_selected: Optional[SelectedServing] = Field(default=None, description="Single item serving shortcut")
    number_of_servings: Optional[float] = Field(default=None, gt=0.0, description="Single item quantity")
    notes: Optional[str] = Field(default=None, max_length=500, description="Optional meal note")

    @model_validator(mode="after")
    def assemble_items(self) -> "MealLogCreate":
        if self.items is None or len(self.items) == 0:
            if not self.food_id:
                raise ValueError("Must provide either a non-empty 'items' list or a 'food_id'")
            self.items = [
                MealItemAdd(
                    food_id=self.food_id,
                    serving_id=self.serving_id,
                    serving_selected=self.serving_selected,
                    number_of_servings=self.number_of_servings if self.number_of_servings is not None else 1.0,
                )
            ]
        return self


class MealItemUpdate(BaseModel):
    serving_id: Optional[str] = Field(default=None, description="Updated serving option ID")
    serving_selected: Optional[SelectedServing] = Field(default=None, description="Updated explicit serving")
    number_of_servings: Optional[float] = Field(default=None, gt=0.0, description="Updated quantity")

    @model_validator(mode="after")
    def validate_has_update(self) -> "MealItemUpdate":
        if (
            self.serving_id is None
            and self.serving_selected is None
            and self.number_of_servings is None
        ):
            raise ValueError("Must specify at least one field to update (serving_id, serving_selected, or number_of_servings)")
        return self


class MealLogResponse(BaseModel):
    id: str
    user_id: str
    date: str
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]
    items: List[MealItem]
    notes: Optional[str] = None
    total_nutrients: ComputedNutrients
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_meal_log(cls, meal: MealLog) -> "MealLogResponse":
        return cls(
            id=str(meal.id) if meal.id else "",
            user_id=str(meal.user_id),
            date=meal.date,
            meal_type=meal.meal_type,
            items=meal.items,
            notes=meal.notes,
            total_nutrients=meal.calculate_total_nutrients(),
            created_at=meal.created_at,
            updated_at=meal.updated_at,
        )


class DailyMealsSummaryResponse(BaseModel):
    date: str
    user_id: str
    meals: List[MealLogResponse]
    daily_totals: ComputedNutrients
