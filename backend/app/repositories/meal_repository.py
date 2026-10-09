from typing import List, Optional
from bson import ObjectId
from pymongo import ASCENDING
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase

from app.models.common import utc_now
from app.models.meal_log import MealLog


class MealRepository:
    """
    Data access layer for the meal_logs collection.
    Every operation is strictly scoped to the user_id.
    """

    def __init__(self, db: AsyncDatabase):
        self.db = db
        self.collection: AsyncCollection = db.meal_logs

    async def get_by_id(self, meal_id: ObjectId, user_id: ObjectId) -> Optional[MealLog]:
        """Fetch a meal log by its ObjectId strictly verifying owning user_id."""
        doc = await self.collection.find_one({"_id": meal_id, "user_id": user_id})
        if doc is None:
            return None
        return MealLog(**doc)

    async def get_by_user_date_and_type(
        self, user_id: ObjectId, date: str, meal_type: str
    ) -> Optional[MealLog]:
        """Fetch a meal log for a specific user, date, and meal category."""
        doc = await self.collection.find_one({
            "user_id": user_id,
            "date": date,
            "meal_type": meal_type,
        })
        if doc is None:
            return None
        return MealLog(**doc)

    async def get_meals_by_user_and_date(
        self, user_id: ObjectId, date: str
    ) -> List[MealLog]:
        """Fetch all meal logs for a specific user on a given date."""
        cursor = self.collection.find({
            "user_id": user_id,
            "date": date,
        }).sort("created_at", ASCENDING)
        return [MealLog(**doc) async for doc in cursor]

    async def find_meal_by_item_id(
        self, log_item_id: str, user_id: ObjectId
    ) -> Optional[MealLog]:
        """
        Locate the MealLog containing a specific log_item_id for the given user.
        """
        doc = await self.collection.find_one({
            "user_id": user_id,
            "items.log_item_id": log_item_id,
        })
        if doc is None:
            # Fallback scan across user's meal logs for mock DB or non-indexed environments
            cursor = self.collection.find({"user_id": user_id})
            async for mdoc in cursor:
                items = mdoc.get("items", [])
                if any(it.get("log_item_id") == log_item_id for it in items):
                    return MealLog(**mdoc)
            return None
        return MealLog(**doc)

    async def create(self, meal: MealLog) -> MealLog:
        """Insert a new meal log document."""
        if meal.id is None:
            meal.id = ObjectId()
        now = utc_now()
        meal.created_at = now
        meal.updated_at = now
        doc = meal.model_dump(by_alias=True)
        await self.collection.insert_one(doc)
        return meal

    async def update(self, meal: MealLog) -> MealLog:
        """Persist modifications to an existing meal log document."""
        meal.updated_at = utc_now()
        doc = meal.model_dump(by_alias=True)
        await self.collection.update_one(
            {"_id": meal.id, "user_id": meal.user_id},
            {"$set": doc},
        )
        return meal

    async def delete(self, meal_id: ObjectId, user_id: ObjectId) -> bool:
        """Delete a meal log document strictly scoped to its owner."""
        res = await self.collection.delete_one({"_id": meal_id, "user_id": user_id})
        return res.deleted_count > 0
