import uuid
from typing import List, Literal, Optional
from pydantic import Field, model_validator
from app.models.common import AuditedMongoModel, MongoBaseModel, PyObjectId


class ServingSize(MongoBaseModel):
    serving_id: str = Field(default_factory=lambda: f"srv_{uuid.uuid4().hex[:8]}")
    description: str = Field(..., min_length=1, max_length=100, description="e.g. '1 cup dry', '1 medium banana', '100g'")
    weight_g: float = Field(..., gt=0.0, description="Weight in grams corresponding to this serving")
    is_default: bool = Field(default=False, description="Whether this is the recommended default serving")


class NutrientsPer100g(MongoBaseModel):
    calories: float = Field(..., ge=0.0, description="Energy in kcal per 100g")
    protein_g: float = Field(..., ge=0.0, description="Protein in grams per 100g")
    carbs_g: float = Field(..., ge=0.0, description="Carbohydrates in grams per 100g")
    fat_g: float = Field(..., ge=0.0, description="Total fats in grams per 100g")
    fiber_g: float = Field(default=0.0, ge=0.0, description="Dietary fiber in grams per 100g")
    sugar_g: float = Field(default=0.0, ge=0.0, description="Total sugars in grams per 100g")
    sodium_mg: float = Field(default=0.0, ge=0.0, description="Sodium in milligrams per 100g")


class FoodProvenance(MongoBaseModel):
    """
    Tracks data origin and licensing for the hybrid food data model:
      - 'system': Starter curated seeds shipped with the project.
      - 'user': Custom user-created foods strictly owned by created_by.
      - 'external': Ephemeral or live-queried external public databases.
      - 'cached': Locally cached external query results in installer's MongoDB.
    """
    source_type: Literal["system", "user", "external", "cached"] = Field(
        default="user",
        description="Origin category of this food item",
    )
    source_name: Optional[str] = Field(
        default=None,
        description="Name of source provider, e.g. 'starter_pack', 'usda_fdc', 'open_food_facts', 'custom'",
    )
    external_id: Optional[str] = Field(
        default=None,
        description="Original identifier from the external public data source",
    )
    attribution: Optional[str] = Field(
        default=None,
        description="Required attribution, author or copyright string",
    )
    license: Optional[str] = Field(
        default=None,
        description="Applicable license notice (e.g. 'Public Domain', 'CC-BY-4.0', 'ODbL')",
    )


class Food(AuditedMongoModel):
    """
    Food item representation supporting hybrid food catalog architecture.
    """
    name: str = Field(..., min_length=1, max_length=200)
    brand: Optional[str] = Field(default=None, max_length=100)
    barcode: Optional[str] = Field(default=None, max_length=50)
    is_system: bool = Field(default=False, description="True for pre-seeded public foods, False for custom user or external foods")
    created_by: Optional[PyObjectId] = Field(default=None, description="User ID for custom foods; null for system/external/cached foods")
    provenance: FoodProvenance = Field(default_factory=lambda: FoodProvenance(source_type="user"))
    serving_sizes: List[ServingSize] = Field(default_factory=list)
    nutrients_per_100g: NutrientsPer100g
    tags: List[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_food_ownership_and_servings(self) -> "Food":
        # Synchronize is_system and provenance.source_type
        if self.is_system or self.provenance.source_type == "system":
            self.is_system = True
            self.provenance.source_type = "system"
            if self.created_by is not None:
                raise ValueError("System foods must have created_by=None")
        elif self.provenance.source_type == "user":
            self.is_system = False
            if self.created_by is None:
                raise ValueError("Custom foods (source_type='user') must specify created_by (User ID)")
        elif self.provenance.source_type in ["external", "cached"]:
            self.is_system = False
            # External or cached foods belong to the local database, not an individual user
            if self.created_by is not None:
                raise ValueError("External/cached foods must have created_by=None")

        if not self.serving_sizes:
            # Automatically add a default 100g serving if none provided
            self.serving_sizes = [
                ServingSize(description="100g", weight_g=100.0, is_default=True)
            ]
        return self
