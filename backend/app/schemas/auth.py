from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserPublic


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class RegisterResponse(BaseModel):
    user: UserPublic
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class FirebaseLoginRequest(BaseModel):
    id_token: str


class FirebaseLoginResponse(BaseModel):
    user: UserPublic
