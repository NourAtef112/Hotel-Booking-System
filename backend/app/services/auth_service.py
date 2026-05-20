"""
auth_service.py — Authentication business logic.
ZERO FastAPI imports. ZERO HTTPException. Pure Python + custom exceptions.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import settings
from app.core.exceptions import (
    AuthenticationError,
    DuplicateEmailError,
    EmailConflictError,
    InvalidResetTokenError,
    InvalidTokenError,
)
from app.core.firebase import verify_firebase_token_async
from app.repositories import user_repository

# ── In-memory stores (course project — no Redis) ─────────────────────────────

_token_blacklist: set[str] = set()
_reset_tokens: dict[str, dict] = {}


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
    if token in _token_blacklist:
        raise InvalidTokenError("Token has been revoked")

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


def blacklist_token(token: str) -> None:
    """Add a token to the blacklist, preventing future use."""
    _token_blacklist.add(token)


def is_token_blacklisted(token: str) -> bool:
    return token in _token_blacklist


async def forgot_password(session: AsyncSession, email: str) -> str:
    """
    Generate a 15-minute reset token for the given email.
    Always returns a token string — does not reveal whether the email is registered.
    """
    user = await user_repository.get_by_email(session, email)
    if not user:
        return secrets.token_urlsafe(32)

    reset_token = secrets.token_urlsafe(32)
    _reset_tokens[reset_token] = {
        "user_id": user.id,
        "expires_at": datetime.utcnow() + timedelta(minutes=15),
    }
    return reset_token


async def reset_password(session: AsyncSession, token: str, new_password: str) -> None:
    """
    Validate reset token, update the user's password, invalidate the token.
    Raises InvalidResetTokenError if token is not found, expired, or already used.
    """
    entry = _reset_tokens.get(token)
    if not entry:
        raise InvalidResetTokenError()
    if datetime.utcnow() > entry["expires_at"]:
        del _reset_tokens[token]
        raise InvalidResetTokenError("Password reset token has expired")

    await user_repository.update_user(
        session, entry["user_id"], {"hashed_password": security.hash_password(new_password)}
    )
    await session.commit()
    del _reset_tokens[token]


async def update_profile(
    session: AsyncSession,
    user_id: int,
    full_name: Optional[str],
    email: Optional[str],
    password: Optional[str],
    current_password: Optional[str],
):
    """
    Apply partial profile updates.
    Raises AuthenticationError if current_password is wrong.
    Raises EmailConflictError if new email is taken by another user.
    """
    user = await user_repository.get_by_id(session, user_id)
    update_data: dict = {}

    if password is not None:
        if not current_password:
            raise AuthenticationError("current_password is required to change password")
        if not security.verify_password(current_password, user.hashed_password):
            raise AuthenticationError("Current password is incorrect")
        update_data["hashed_password"] = security.hash_password(password)

    if email is not None and email != user.email:
        conflict = await user_repository.get_by_email(session, email)
        if conflict and conflict.id != user_id:
            raise EmailConflictError(email)
        update_data["email"] = email

    if full_name is not None:
        update_data["full_name"] = full_name

    if not update_data:
        return user

    updated = await user_repository.update_user(session, user_id, update_data)
    await session.commit()
    return updated
