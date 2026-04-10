from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class ErrorResponse(BaseModel):
    error: str


class ValidationErrorResponse(BaseModel):
    error: str = "validation failed"
    fields: dict[str, str]
