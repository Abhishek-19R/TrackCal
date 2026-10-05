import re
from typing import List, Optional, Tuple
from bson import ObjectId
from pymongo import ASCENDING
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase

from app.models.common import utc_now
from app.models.food import Food


class FoodRepository:
    """
    Data access layer for the foods collection in MongoDB.
    Strictly encapsulates all database interactions.
    """

    def __init__(self, db: AsyncDatabase):
        self.db = db
        self.collection: AsyncCollection = db.foods

    def _build_access_filter(self, current_user_id: Optional[ObjectId]) -> dict:
        """
        Builds the 4-tier security access filter:
        Accessible foods are system foods, locally cached foods, or foods created by the current user.
        Never matches another user's custom foods.
        """
        or_clauses = [
            {"is_system": True},
            {"provenance.source_type": "cached"},
        ]
        if current_user_id:
            or_clauses.append({"created_by": current_user_id})

        return {"$or": or_clauses}

    async def search(
        self,
        query: Optional[str] = None,
        current_user_id: Optional[ObjectId] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Food], int]:
        """
        Search foods with scoping rules and pagination.
        Handles both text index searches and regex fallbacks.
        """
        access_filter = self._build_access_filter(current_user_id)
        skip = (page - 1) * limit

        cleaned_query = query.strip() if query else ""

        if not cleaned_query:
            # Empty query: return accessible foods sorted by name
            total = await self.collection.count_documents(access_filter)
            cursor = (
                self.collection.find(access_filter)
                .sort("name", ASCENDING)
                .skip(skip)
                .limit(limit)
            )
            items = [Food(**doc) async for doc in cursor]
            return items, total

        # When a query term is provided:
        # First attempt text index search (matches idx_foods_text_search)
        text_filter = {"$and": [access_filter, {"$text": {"$search": cleaned_query}}]}
        try:
            total = await self.collection.count_documents(text_filter)
            if total > 0:
                cursor = self.collection.find(text_filter).skip(skip).limit(limit)
                items = [Food(**doc) async for doc in cursor]
                return items, total
        except Exception:
            # OperationFailure or mock database without text index: fall through to regex
            pass

        # Regex fallback: matches substring in name, brand, or tags
        escaped = re.escape(cleaned_query)
        regex_filter = {
            "$and": [
                access_filter,
                {
                    "$or": [
                        {"name": {"$regex": escaped, "$options": "i"}},
                        {"brand": {"$regex": escaped, "$options": "i"}},
                        {"tags": {"$regex": escaped, "$options": "i"}},
                    ]
                },
            ]
        }
        total = await self.collection.count_documents(regex_filter)
        cursor = (
            self.collection.find(regex_filter)
            .sort("name", ASCENDING)
            .skip(skip)
            .limit(limit)
        )
        items = [Food(**doc) async for doc in cursor]
        return items, total

    async def get_by_id(self, food_id: ObjectId) -> Optional[Food]:
        """Fetch a single food document by its ObjectId."""
        doc = await self.collection.find_one({"_id": food_id})
        if doc is None:
            return None
        return Food(**doc)

    async def create(self, food: Food) -> Food:
        """Insert a new food item document."""
        if food.id is None:
            food.id = ObjectId()

        doc = food.model_dump(by_alias=True)
        await self.collection.insert_one(doc)
        return food

    async def update(self, food_id: ObjectId, update_data: dict) -> Optional[Food]:
        """Update fields of an existing food document."""
        update_data["updated_at"] = utc_now()
        await self.collection.update_one(
            {"_id": food_id},
            {"$set": update_data},
        )
        return await self.get_by_id(food_id)

    async def delete(self, food_id: ObjectId) -> bool:
        """Delete a food document by its ObjectId."""
        result = await self.collection.delete_one({"_id": food_id})
        return result.deleted_count > 0

    async def find_system_food_by_name_and_brand(
        self, name: str, brand: Optional[str]
    ) -> Optional[Food]:
        """Locate an existing system food by unique combination of name and brand."""
        doc = await self.collection.find_one({
            "is_system": True,
            "name": name,
            "brand": brand,
        })
        if doc is None:
            return None
        return Food(**doc)

    async def upsert_system_food(self, food: Food) -> Tuple[Food, bool]:
        """
        Idempotently insert or update a system food record.
        Returns: (food, was_created)
        """
        existing = await self.find_system_food_by_name_and_brand(food.name, food.brand)
        if existing is not None:
            # Update system food metadata without duplicating
            update_payload = {
                "provenance": food.provenance.model_dump(),
                "serving_sizes": [s.model_dump() for s in food.serving_sizes],
                "nutrients_per_100g": food.nutrients_per_100g.model_dump(),
                "tags": food.tags,
                "barcode": food.barcode,
                "updated_at": utc_now(),
            }
            updated = await self.update(existing.id, update_payload)
            return updated or existing, False
        else:
            created = await self.create(food)
            return created, True
