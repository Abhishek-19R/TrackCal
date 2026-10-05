import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.database import (
    close_mongo_connection,
    connect_to_mongo,
    db_manager,
    ensure_indexes,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("nutritrack")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application and database lifecycle."""
    settings = get_settings()
    logger.info("Initializing %s v%s...", settings.PROJECT_NAME, settings.VERSION)

    # 1. Connect to MongoDB
    try:
        await connect_to_mongo()
        # Attempt to ping and build indexes if database is reachable
        if db_manager.db is not None:
            try:
                await db_manager.db.command("ping")
                logger.info("MongoDB connection verified. Ensuring indexes...")
                await ensure_indexes(db_manager.db)
            except Exception as exc:
                logger.warning(
                    "MongoDB is not currently reachable during startup (%s). "
                    "The application will start in degraded mode.",
                    exc,
                )
    except Exception as exc:
        logger.error("Failed to initialize MongoDB client: %s", exc)

    yield

    # 2. Shutdown & cleanup
    logger.info("Shutting down %s...", settings.PROJECT_NAME)
    await close_mongo_connection()


settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Modern, AI-independent core nutrition and food tracking web application.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
