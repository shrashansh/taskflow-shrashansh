from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.exceptions import ConflictException, UnauthorizedException
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import AuthResponse, UserResponse

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=max(settings.BCRYPT_COST, 12),
)


class AuthService:
    def __init__(self, session: AsyncSession):
        self.repo = UserRepository(session)

    async def register(self, name: str, email: str, password: str) -> AuthResponse:
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ConflictException("email already registered")

        hashed = self._hash_password(password)
        user = await self.repo.create(name, email, hashed)
        token = self._create_token(user)
        return AuthResponse(token=token, user=UserResponse.model_validate(user))

    async def login(self, email: str, password: str) -> AuthResponse:
        user = await self.repo.get_by_email(email)
        if not user:
            raise UnauthorizedException("invalid credentials")

        if not self._verify_password(password, user.password):
            raise UnauthorizedException("invalid credentials")

        token = self._create_token(user)
        return AuthResponse(token=token, user=UserResponse.model_validate(user))

    @staticmethod
    def _hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def _verify_password(plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    @staticmethod
    def _create_token(user: User) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "exp": now + timedelta(hours=settings.JWT_EXPIRY_HOURS),
            "iat": now,
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
