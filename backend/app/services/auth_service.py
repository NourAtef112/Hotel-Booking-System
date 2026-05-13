"""
auth_service.py — Business logic layer for authentication.
All functions are stubs. No implementation yet.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.schemas.auth import RegisterRequest, LoginRequest
from app.repositories import user_repository
from app.core import security
from app.core.config import settings


async def register_user(session: AsyncSession, payload: RegisterRequest) -> dict:
    """Register a new user."""
    existing_user = await user_repository.get_by_email(session, payload.email)
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")
        
    user_data = {
        "name": payload.name,
        "email": payload.email,
        "hashed_password": security.hash_password(payload.password),
        "role": "guest"
    }
    user = await user_repository.create_user(session, user_data)
    await session.commit()
    
    access_token = security.create_access_token(data={"sub": str(user.id)})
    return {
        "user": user,
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


async def authenticate_user(session: AsyncSession, payload: LoginRequest) -> dict:
    """Authenticate user credentials and return JWT token."""
    user = await user_repository.get_by_email(session, payload.email)
    if not user or not security.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    access_token = security.create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

