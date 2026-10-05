from pydantic import EmailStr, Field
from app.models.common import AuditedMongoModel


class User(AuditedMongoModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    hashed_password: str
    is_active: bool = True
