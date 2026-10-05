import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path so it can be run standalone
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.database import close_mongo_connection, connect_to_mongo, db_manager
from app.services.seed_service import seed_starter_foods

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("seed_foods")


async def main():
    print("=" * 60)
    print("NutriTrack - Starter Foods Database Seeder")
    print("=" * 60)

    try:
        await connect_to_mongo()
        if db_manager.db is None:
            print("ERROR: Failed to connect to MongoDB.")
            sys.exit(1)

        print(f"Connected to database '{db_manager.db.name}'. Seeding starter foods...")
        summary = await seed_starter_foods(db=db_manager.db)

        print("\nSeeding Results:")
        print(f"  - Total Processed : {summary['total_processed']}")
        print(f"  - Newly Created   : {summary['created']}")
        print(f"  - Updated Existing: {summary['updated']}")
        print("=" * 60)
        print("Starter foods seed finished successfully.")
    except Exception as exc:
        logger.error("Seeding failed with error: %s", exc, exc_info=True)
        sys.exit(1)
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
