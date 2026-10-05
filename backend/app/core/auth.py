from bson import ObjectId
from pydantic import BaseModel, Field
from app.models.common import PyObjectId


class CurrentUser(BaseModel):
    """
    Representation of the authenticated user identity in the request context.
    Allows clean dependency injection across services and endpoints without
    hardcoding a full authentication flow before Phase 2.
    """
    id: PyObjectId = Field(default_factory=ObjectId)
    email: str = "user@example.com"
    username: str = "default_user"
    is_active: bool = True

    model_config = {
        "arbitrary_types_allowed": True,
    }
