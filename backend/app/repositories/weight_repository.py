from typing import List, Optional, Tuple
from bson import ObjectId
from pymongo import DESCENDING
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase

from app.models.common import utc_now
from app.models.weight_log import WeightLog


class WeightRepository:
    """
    Data access layer for the weight_logs collection.
    Every operation is strictly scoped to user_id.
    """

    def __init__(self, db: AsyncDatabase):
        self.db = db
        self.collection: AsyncCollection = db.weight_logs

    async def get_by_id(self, weight_id: ObjectId, user_id: ObjectId) -> Optional[WeightLog]:
        """Fetch a single weight log entry strictly scoped to the owner."""
        doc = await self.collection.find_one({"_id": weight_id, "user_id": user_id})
        if doc is None:
            return None
        return WeightLog(**doc)

    async def get_by_user_and_date(
        self, user_id: ObjectId, date: str
    ) -> Optional[WeightLog]:
        """Fetch a user's weight entry for a specific date."""
        doc = await self.collection.find_one({"user_id": user_id, "date": date})
        if doc is None:
            return None
        return WeightLog(**doc)

    async def list_by_user(
        self,
        user_id: ObjectId,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[WeightLog]:
        """
        List a user's weight entries, optionally bounded by date range,
        sorted chronologically descending (most recent first).
        """
        query = {"user_id": user_id}
        date_filter = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date
        if date_filter:
            query["date"] = date_filter

        cursor = self.collection.find(query).sort("date", DESCENDING)
        return [WeightLog(**doc) async for doc in cursor]

    async def upsert(self, weight: WeightLog) -> Tuple[WeightLog, bool]:
        """
        Record or update a weight entry for a given user and date.
        Returns: (saved_weight, was_created)
        """
        existing = await self.get_by_user_and_date(weight.user_id, weight.date)
        if existing is not None:
            weight.id = existing.id
            doc = weight.model_dump(by_alias=True)
            await self.collection.update_one(
                {"_id": existing.id, "user_id": weight.user_id},
                {"$set": doc},
            )
            return weight, False
        else:
            if weight.id is None:
                weight.id = ObjectId()
            if weight.created_at is None:
                weight.created_at = utc_now()
            doc = weight.model_dump(by_alias=True)
            await self.collection.insert_one(doc)
            return weight, True

    async def delete(self, weight_id: ObjectId, user_id: ObjectId) -> bool:
        """Delete a weight record strictly owned by the current user."""
        res = await self.collection.delete_one({"_id": weight_id, "user_id": user_id})
        return res.deleted_count > 0
