from typing import Literal, Optional
from pydantic import BaseModel, Field


class DatabaseHealth(BaseModel):
    status: Literal["connected", "disconnected"]
    latency_ms: Optional[float] = Field(default=None, description="Ping roundtrip latency in milliseconds")
    message: Optional[str] = Field(default=None, description="Status detail or error message if disconnected")


class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded"]
    app: str = Field(..., description="Application name")
    environment: str = Field(..., description="Current environment mode")
    version: str = Field(..., description="API version")
    database: DatabaseHealth
