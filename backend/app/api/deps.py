from typing import Optional
from bson import ObjectId
from fastapi import Header, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.core.auth import CurrentUser
from app.core.database import get_database

DEFAULT_USER_ID = ObjectId("65f000000000000000000001")


async def get_current_user(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    authorization: Optional[str] = Header(default=None),
) -> CurrentUser:
    """
    Extract current authenticated user identity.
    Tests and callers can specify an X-User-ID header with an ObjectId string,
    or override this dependency via FastAPI app.dependency_overrides.
    """
    if x_user_id:
        if not ObjectId.is_valid(x_user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid X-User-ID header: '{x_user_id}' is not a valid 24-character hex ObjectId",
            )
        return CurrentUser(
            id=ObjectId(x_user_id),
            email="user@nutritrack.local",
            username="nutri_user",
        )

    # Default fallback for development/testing when no auth header is supplied
    return CurrentUser(
        id=DEFAULT_USER_ID,
        email="default@nutritrack.local",
        username="default_user",
    )


def get_db() -> AsyncDatabase:
    """Dependency wrapper for retrieving the active PyMongo Async database."""
    return get_database()
