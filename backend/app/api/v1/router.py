from fastapi import APIRouter
from app.api.v1.endpoints import foods, health

api_v1_router = APIRouter()

# Core system routes
api_v1_router.include_router(health.router, tags=["Health"])

# Food catalog routes
api_v1_router.include_router(foods.router, prefix="/foods", tags=["Foods"])
