from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from app.models.meal_log import ComputedNutrients, MealItem, SelectedServing


class MealItemAdd(BaseModel):
    food_id: str
    serving_selected: SelectedServing
    number_of_servings: float = Field(..., gt=0.0)


class MealItemUpdate(BaseModel):
    serving_selected: Optional[SelectedServing] = None
    number_of_servings: Optional[float] = Field(default=None, gt=0.0)


class MealLogResponse(BaseModel):
    id: str
    user_id: str
    date: str
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]
    items: List[MealItem]
    notes: Optional[str]
    total_nutrients: ComputedNutrients
    created_at: datetime
    updated_at: datetime


class DailyMealsSummaryResponse(BaseModel):
    date: str
    user_id: str
    meals: List[MealLogResponse]
    daily_totals: ComputedNutrients
