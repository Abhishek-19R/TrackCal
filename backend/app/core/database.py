import inspect
import logging
import time
from typing import Optional, Tuple
from pymongo import ASCENDING, DESCENDING, TEXT, AsyncMongoClient, IndexModel
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import PyMongoError

from app.core.config import get_settings

logger = logging.getLogger("nutritrack.database")


class DatabaseManager:
    client: Optional[AsyncMongoClient] = None
    db: Optional[AsyncDatabase] = None


db_manager = DatabaseManager()


async def connect_to_mongo() -> None:
    """
    Initialize the MongoDB connection pool using native PyMongo Async API.
    Connects exclusively to the installer/user-configured MongoDB deployment.
    """
    settings = get_settings()
    logger.info("Connecting to MongoDB at %s...", settings.MONGODB_URI)
    db_manager.client = AsyncMongoClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=settings.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    )
    db_manager.db = db_manager.client[settings.MONGODB_DB_NAME]
    logger.info("Connected to database '%s'", settings.MONGODB_DB_NAME)


async def close_mongo_connection() -> None:
    """Close the MongoDB connection pool cleanly using native PyMongo Async API."""
    if db_manager.client is not None:
        logger.info("Closing MongoDB connection...")
        await db_manager.client.close()
        db_manager.client = None
        db_manager.db = None
        logger.info("MongoDB connection closed.")


def get_database() -> AsyncDatabase:
    """Retrieve the active database instance."""
    if db_manager.db is None:
        raise RuntimeError("Database is not initialized. Ensure lifespan has started.")
    return db_manager.db


async def check_db_connectivity() -> Tuple[bool, Optional[float], Optional[str]]:
    """
    Ping the database and measure roundtrip latency.
    Returns:
        (is_connected, latency_ms, error_message)
    """
    if db_manager.db is None:
        return False, None, "Database client is not initialized"

    try:
        start_time = time.perf_counter()
        await db_manager.db.command("ping")
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return True, latency_ms, None
    except PyMongoError as exc:
        logger.warning("MongoDB ping failed: %s", exc)
        return False, None, str(exc)
    except Exception as exc:
        logger.error("Unexpected error during MongoDB ping: %s", exc)
        return False, None, str(exc)


async def ensure_indexes(db: AsyncDatabase) -> None:
    """
    Idempotently build indexes on MongoDB collections defined in ARCHITECTURE.md.
    """
    logger.info("Ensuring database indexes...")

    # 1. users indexes
    await db.users.create_indexes([
        IndexModel([("email", ASCENDING)], unique=True, name="idx_users_email_unique"),
        IndexModel([("username", ASCENDING)], unique=True, name="idx_users_username_unique"),
    ])

    # 2. user_settings indexes
    await db.user_settings.create_indexes([
        IndexModel([("user_id", ASCENDING)], unique=True, name="idx_user_settings_user_id_unique"),
    ])

    # 3. foods indexes
    # Migrate legacy sparse barcode index if present (which collides on multiple barcode: null)
    try:
        index_info_fn = getattr(db.foods, "index_information", None)
        if callable(index_info_fn):
            res = index_info_fn()
            existing_indexes = await res if inspect.isawaitable(res) else res
            if isinstance(existing_indexes, dict):
                drop_fn = getattr(db.foods, "drop_index", None)
                if "idx_foods_barcode_sparse" in existing_indexes and callable(drop_fn):
                    logger.info("Migrating legacy 'idx_foods_barcode_sparse' index to partial unique index...")
                    drop_res = drop_fn("idx_foods_barcode_sparse")
                    if inspect.isawaitable(drop_res):
                        await drop_res
                elif "idx_foods_barcode_unique" in existing_indexes and callable(drop_fn):
                    info = existing_indexes["idx_foods_barcode_unique"]
                    if isinstance(info, dict) and "partialFilterExpression" not in info:
                        logger.info("Recreating 'idx_foods_barcode_unique' with partialFilterExpression...")
                        drop_res = drop_fn("idx_foods_barcode_unique")
                        if inspect.isawaitable(drop_res):
                            await drop_res
    except Exception as exc:
        logger.warning("Could not perform index migration check on foods: %s", exc)

    await db.foods.create_indexes([
        IndexModel([("name", TEXT), ("brand", TEXT), ("tags", TEXT)], name="idx_foods_text_search"),
        IndexModel([("is_system", ASCENDING), ("created_by", ASCENDING)], name="idx_foods_system_created"),
        IndexModel([("provenance.source_type", ASCENDING), ("created_by", ASCENDING)], name="idx_foods_provenance_scoping"),
        IndexModel([("created_by", ASCENDING), ("name", ASCENDING)], name="idx_foods_user_foods"),
        IndexModel(
            [("barcode", ASCENDING)],
            unique=True,
            partialFilterExpression={"barcode": {"$type": "string"}},
            name="idx_foods_barcode_unique",
        ),
    ])

    # 4. meal_logs indexes
    await db.meal_logs.create_indexes([
        IndexModel([("user_id", ASCENDING), ("date", ASCENDING), ("meal_type", ASCENDING)], name="idx_meal_logs_user_date_type"),
        IndexModel([("user_id", ASCENDING), ("date", ASCENDING)], name="idx_meal_logs_user_date"),
    ])

    # 5. weight_logs indexes
    await db.weight_logs.create_indexes([
        IndexModel([("user_id", ASCENDING), ("date", DESCENDING)], unique=True, name="idx_weight_logs_user_date_unique"),
    ])

    logger.info("Database indexes ensured successfully.")
