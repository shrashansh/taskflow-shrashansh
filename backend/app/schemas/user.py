from pydantic import BaseModel

from app.schemas.auth import UserResponse


class UserListResponse(BaseModel):
    users: list[UserResponse]
