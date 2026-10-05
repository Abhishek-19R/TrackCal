from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.food import Food, FoodProvenance, NutrientsPer100g, ServingSize


class FoodCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    brand: Optional[str] = Field(default=None, max_length=100)
    barcode: Optional[str] = Field(default=None, max_length=50)
    serving_sizes: List[ServingSize] = Field(default_factory=list)
    nutrients_per_100g: NutrientsPer100g
    tags: List[str] = Field(default_factory=list)
    provenance: Optional[FoodProvenance] = None


class FoodUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    brand: Optional[str] = None
    barcode: Optional[str] = None
    serving_sizes: Optional[List[ServingSize]] = None
    nutrients_per_100g: Optional[NutrientsPer100g] = None
    tags: Optional[List[str]] = None


class FoodResponse(BaseModel):
    id: str
    name: str
    brand: Optional[str] = None
    barcode: Optional[str] = None
    is_system: bool
    created_by: Optional[str] = None
    provenance: FoodProvenance
    serving_sizes: List[ServingSize]
    nutrients_per_100g: NutrientsPer100g
    tags: List[str]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_food(cls, food: Food) -> "FoodResponse":
        return cls(
            id=str(food.id) if food.id else "",
            name=food.name,
            brand=food.brand,
            barcode=food.barcode,
            is_system=food.is_system,
            created_by=str(food.created_by) if food.created_by else None,
            provenance=food.provenance,
            serving_sizes=food.serving_sizes,
            nutrients_per_100g=food.nutrients_per_100g,
            tags=food.tags,
            created_at=food.created_at,
            updated_at=food.updated_at,
        )


class FoodSearchResponse(BaseModel):
    items: List[FoodResponse]
    total: int
    page: int
    limit: int
