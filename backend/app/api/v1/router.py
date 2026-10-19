from fastapi import APIRouter
from app.api.v1.endpoints import foods, health, meals, user_settings, weights

api_v1_router = APIRouter()

# Core system routes
api_v1_router.include_router(health.router, tags=["Health"])

# User settings, profile & onboarding routes
api_v1_router.include_router(user_settings.router, prefix="/user", tags=["User & Settings"])

# Food catalog routes
api_v1_router.include_router(foods.router, prefix="/foods", tags=["Foods"])

# Meal logging routes
api_v1_router.include_router(meals.router, prefix="/meals", tags=["Meals"])

# Weight tracking routes
api_v1_router.include_router(weights.router, prefix="/weights", tags=["Weights"])
