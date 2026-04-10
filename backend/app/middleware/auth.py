from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.exceptions import UnauthorizedException
from app.models.user import User
from app.repositories.user import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise UnauthorizedException("unauthorized")

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=["HS256"],
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise UnauthorizedException("unauthorized")
    except JWTError:
        raise UnauthorizedException("unauthorized")

    repo = UserRepository(session)
    user = await repo.get_by_id(UUID(user_id))
    if user is None:
        raise UnauthorizedException("unauthorized")

    return user
