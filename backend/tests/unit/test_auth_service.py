"""
Unit tests for app/services/auth_service.py.
Uses an in-memory fake repo — no database required.
"""

from __future__ import annotations

import pytest
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.exceptions import AuthenticationError, DuplicateEmailError, InvalidTokenError
from app.core import security


# ── Fake User dataclass (stands in for the SQLAlchemy User model) ──────────────

@dataclass
class FakeUser:
    id: int
    email: str
    hashed_password: str
    full_name: str
    role: str = "guest"
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.now)


# ── Fake session + repository helpers ─────────────────────────────────────────

def _make_session(existing_user: Optional[FakeUser] = None, created_user: Optional[FakeUser] = None):
    """
    Return a mock AsyncSession whose commit/refresh are no-ops,
    and patch user_repository to use in-memory fakes.
    """
    session = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


# ── test_register ──────────────────────────────────────────────────────────────

async def test_register_creates_user_with_hashed_password():
    new_user = FakeUser(id=1, email="alice@ejust.edu.eg", hashed_password="", full_name="Alice")

    with (
        patch("app.services.auth_service.user_repository.get_by_email", new=AsyncMock(return_value=None)),
        patch("app.services.auth_service.user_repository.create_user", new=AsyncMock(return_value=new_user)),
    ):
        session = _make_session()
        from app.services import auth_service

        result = await auth_service.register(session, "alice@ejust.edu.eg", "password123", "Alice")

    assert result["access_token"] != ""
    assert result["token_type"] == "bearer"
    assert result["user"] is new_user


async def test_login_returns_token_for_valid_credentials():
    hashed = security.hash_password("correct_password")
    user = FakeUser(id=2, email="bob@ejust.edu.eg", hashed_password=hashed, full_name="Bob")

    with patch("app.services.auth_service.user_repository.get_by_email", new=AsyncMock(return_value=user)):
        session = _make_session()
        from app.services import auth_service

        result = await auth_service.login(session, "bob@ejust.edu.eg", "correct_password")

    assert "access_token" in result
    assert result["token_type"] == "bearer"


async def test_login_fails_for_wrong_password():
    hashed = security.hash_password("real_password")
    user = FakeUser(id=3, email="carol@ejust.edu.eg", hashed_password=hashed, full_name="Carol")

    with patch("app.services.auth_service.user_repository.get_by_email", new=AsyncMock(return_value=user)):
        session = _make_session()
        from app.services import auth_service

        with pytest.raises(AuthenticationError):
            await auth_service.login(session, "carol@ejust.edu.eg", "wrong_password")


async def test_login_fails_for_nonexistent_email():
    with patch("app.services.auth_service.user_repository.get_by_email", new=AsyncMock(return_value=None)):
        session = _make_session()
        from app.services import auth_service

        with pytest.raises(AuthenticationError):
            await auth_service.login(session, "nobody@ejust.edu.eg", "any_password")


async def test_duplicate_email_raises_error():
    existing = FakeUser(id=4, email="dup@ejust.edu.eg", hashed_password="x", full_name="Dup")

    with patch("app.services.auth_service.user_repository.get_by_email", new=AsyncMock(return_value=existing)):
        session = _make_session()
        from app.services import auth_service

        with pytest.raises(DuplicateEmailError):
            await auth_service.register(session, "dup@ejust.edu.eg", "password123", "Dup")


async def test_get_current_user_decodes_valid_token():
    user = FakeUser(id=5, email="dave@ejust.edu.eg", hashed_password="x", full_name="Dave")
    token = security.create_access_token({"sub": str(user.id)})

    with patch("app.services.auth_service.user_repository.get_by_id", new=AsyncMock(return_value=user)):
        session = _make_session()
        from app.services import auth_service

        result = await auth_service.get_current_user(session, token)

    assert result.id == user.id
    assert result.email == user.email


async def test_get_current_user_rejects_invalid_token():
    with patch("app.services.auth_service.user_repository.get_by_id", new=AsyncMock(return_value=None)):
        session = _make_session()
        from app.services import auth_service

        with pytest.raises(InvalidTokenError):
            await auth_service.get_current_user(session, "not.a.valid.token")
