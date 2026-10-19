from typing import Optional
from bson import ObjectId
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase

from app.models.common import utc_now
from app.models.user_settings import UserSettings


class UserSettingsRepository:
    """
    Data access layer for user_settings collection.
    Every operation is strictly scoped to user_id.
    """

    def __init__(self, db: AsyncDatabase):
        self.db = db
        self.collection: AsyncCollection = db.user_settings

    async def get_by_user_id(self, user_id: ObjectId) -> Optional[UserSettings]:
        """Fetch settings for a specific user ID."""
        doc = await self.collection.find_one({"user_id": user_id})
        if doc is None:
            return None
        return UserSettings(**doc)

    async def save(self, settings: UserSettings) -> UserSettings:
        """
        Create or update settings for a user.
        Ensures strict user scoping.
        """
        existing = await self.get_by_user_id(settings.user_id)
        settings.updated_at = utc_now()

        if existing is not None:
            settings.id = existing.id
            doc = settings.model_dump(by_alias=True)
            await self.collection.update_one(
                {"_id": existing.id, "user_id": settings.user_id},
                {"$set": doc},
            )
        else:
            if settings.id is None:
                settings.id = ObjectId()
            if settings.created_at is None:
                settings.created_at = utc_now()
            doc = settings.model_dump(by_alias=True)
            await self.collection.insert_one(doc)

        return settings
