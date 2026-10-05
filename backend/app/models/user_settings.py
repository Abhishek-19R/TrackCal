from typing import Literal
from pydantic import Field
from app.models.common import AuditedMongoModel, PyObjectId


class UserSettings(AuditedMongoModel):
    """
    User-specific nutrition goals and display preferences.
    Security Notice: AI credentials are NEVER stored on the server or in MongoDB;
    they remain exclusively on the user's local device.
    """
    user_id: PyObjectId = Field(..., description="ID of the owning user")
    calorie_target: int = Field(default=2000, ge=500, le=15000, description="Daily calorie target (kcal)")
    protein_target_g: float = Field(default=150.0, ge=0.0, le=1000.0, description="Daily protein target in grams")
    carb_target_g: float = Field(default=200.0, ge=0.0, le=1500.0, description="Daily carbohydrates target in grams")
    fat_target_g: float = Field(default=65.0, ge=0.0, le=500.0, description="Daily fat target in grams")
    water_target_ml: int = Field(default=2500, ge=0, le=20000, description="Daily water intake target (ml)")
    unit_system: Literal["metric", "imperial"] = Field(default="metric", description="Preferred unit system")
