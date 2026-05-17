"""
auth_service.py — Authentication business logic.
ZERO FastAPI imports. ZERO HTTPException. Pure Python + custom exceptions.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import settings
from app.core.exceptions import AuthenticationError, DuplicateEmailError, InvalidTokenError
from app.core.firebase import verify_firebase_token_async
from app.repositories import user_repository


async def register(
    session: AsyncSession,
    email: str,
    password: str,
    full_name: str,
) -> dict:
    """Hash password, persist new guest user, return JWT + user data."""
    existing = await user_repository.get_by_email(session, email)
    if existing:
        raise DuplicateEmailError(email)

    user = await user_repository.create_user(
        session,
        {
            "email": email,
            "hashed_password": security.hash_password(password),
            "full_name": full_name,
            "role": "guest",
        },
    )
    await session.commit()
    await session.refresh(user)

    token = security.create_access_token(data={"sub": str(user.id)})
    return {
        "user": user,
        "access_token": token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_HOURS * 3600,
    }


async def login(session: AsyncSession, email: str, password: str) -> dict:
    """Verify credentials and return signed JWT."""
    user = await user_repository.get_by_email(session, email)
    if not user or not security.verify_password(password, user.hashed_password):
        raise AuthenticationError("Incorrect email or password")

    token = security.create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_HOURS * 3600,
    }


async def firebase_login(session: AsyncSession, id_token: str) -> dict:
    """Verify Firebase ID token, auto-create user on first login."""
    decoded = await verify_firebase_token_async(id_token)
    firebase_uid = decoded["uid"]
    email = decoded.get("email", "")
    name = decoded.get("name", email.split("@")[0] if email else firebase_uid)

    user = await user_repository.get_by_firebase_uid(session, firebase_uid)
    if not user:
        user = await user_repository.create_firebase_user(session, firebase_uid, email, name)
        await session.commit()
        await session.refresh(user)

    return {"user": user}


async def get_current_user(session: AsyncSession, token: str):
    """Decode JWT, look up user in DB. Raises InvalidTokenError if anything fails."""
    payload = security.decode_access_token(token)
    if payload is None:
        raise InvalidTokenError()

    try:
        user_id = int(payload.get("sub", ""))
    except (TypeError, ValueError):
        raise InvalidTokenError()

    user = await user_repository.get_by_id(session, user_id)
    if user is None:
        raise InvalidTokenError()

    return user
