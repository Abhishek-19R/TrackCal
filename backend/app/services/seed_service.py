import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from pymongo.asynchronous.database import AsyncDatabase

from app.core.database import db_manager, get_database
from app.models.food import Food
from app.repositories.food_repository import FoodRepository

logger = logging.getLogger("nutritrack.seed")


def find_starter_foods_file() -> Path:
    """
    Locates the starter_foods.json file across standard execution contexts.
    """
    candidate_paths = [
        Path.cwd() / "data" / "foods" / "starter_foods.json",
        Path.cwd().parent / "data" / "foods" / "starter_foods.json",
        Path(__file__).resolve().parents[3] / "data" / "foods" / "starter_foods.json",
        Path(__file__).resolve().parents[2] / "data" / "foods" / "starter_foods.json",
    ]

    for p in candidate_paths:
        if p.is_file():
            return p

    raise FileNotFoundError(
        f"starter_foods.json not found in candidate paths: {[str(p) for p in candidate_paths]}"
    )


def load_and_validate_starter_foods(file_path: Optional[Path] = None) -> List[Food]:
    """
    Reads the starter_foods.json file and strictly validates each record
    against the Food Pydantic domain model.
    """
    path = file_path or find_starter_foods_file()
    with open(path, "r", encoding="utf-8") as f:
        raw_items = json.load(f)

    if not isinstance(raw_items, list):
        raise ValueError(f"Expected a JSON list in {path}, got {type(raw_items).__name__}")

    validated_foods: List[Food] = []
    for idx, item in enumerate(raw_items):
        try:
            food = Food(**item)
            # Ensure ownership rules are strictly system
            if not food.is_system or food.created_by is not None:
                raise ValueError(
                    f"Food at index {idx} ('{item.get('name')}') must have is_system=True and created_by=None"
                )
            validated_foods.append(food)
        except Exception as exc:
            logger.error("Validation error for starter food item #%d: %s", idx, exc)
            raise ValueError(f"Invalid starter food record at index {idx}: {exc}") from exc

    return validated_foods


async def seed_starter_foods(
    db: Optional[AsyncDatabase] = None,
    file_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Idempotently seeds starter foods into MongoDB.
    Safe to execute repeatedly: updates existing system records and inserts new ones.
    Never modifies user-created foods.
    """
    target_db = db or get_database()
    repository = FoodRepository(target_db)

    foods = load_and_validate_starter_foods(file_path)

    created_count = 0
    updated_count = 0

    for food in foods:
        _, was_created = await repository.upsert_system_food(food)
        if was_created:
            created_count += 1
        else:
            updated_count += 1

    summary = {
        "total_processed": len(foods),
        "created": created_count,
        "updated": updated_count,
    }
    logger.info(
        "Seeding completed: %d total, %d created, %d updated.",
        summary["total_processed"],
        summary["created"],
        summary["updated"],
    )
    return summary
