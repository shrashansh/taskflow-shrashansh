from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import UserResponse
from app.schemas.user import UserListResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse)
async def list_users(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> UserListResponse:
    repo = UserRepository(session)
    users = await repo.list_all()
    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users]
    )
