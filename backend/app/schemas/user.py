from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    username: str
    is_active: bool
    created_at: datetime


class UserSettingsUpdate(BaseModel):
    calorie_target: Optional[int] = Field(default=None, ge=500, le=15000)
    protein_target_g: Optional[float] = Field(default=None, ge=0.0, le=1000.0)
    carb_target_g: Optional[float] = Field(default=None, ge=0.0, le=1500.0)
    fat_target_g: Optional[float] = Field(default=None, ge=0.0, le=500.0)
    water_target_ml: Optional[int] = Field(default=None, ge=0, le=20000)
    unit_system: Optional[Literal["metric", "imperial"]] = None


class UserSettingsResponse(BaseModel):
    id: str
    user_id: str
    calorie_target: int
    protein_target_g: float
    carb_target_g: float
    fat_target_g: float
    water_target_ml: int
    unit_system: str
    updated_at: datetime
