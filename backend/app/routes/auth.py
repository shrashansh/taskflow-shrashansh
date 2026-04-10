from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_db)):
    service = AuthService(session)
    return await service.register(body.name, body.email, body.password)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_db)):
    service = AuthService(session)
    return await service.login(body.email, body.password)
