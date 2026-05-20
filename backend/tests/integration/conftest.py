"""
Integration test infrastructure.

- FakeAsyncSession   : satisfies session.commit/refresh/rollback without a real DB
- _UserStore         : in-memory user store; user IDs start at 1000 to avoid
                       clashing with MockBookingRepository's seeded user_ids (1-4)
- AsyncMockBookingRepository : async wrapper over MockBookingRepository
- patch_user_repo    : autouse fixture — monkeypatches user_repository functions
- client             : TestClient with all dependency overrides applied
- auth_headers       : registers a guest user, returns Bearer headers
- admin_headers      : inserts an admin directly into the store, returns Bearer headers
"""

from __future__ import annotations

import pytest
from dataclasses import dataclass, field
from datetime import date, datetime
from fastapi.testclient import TestClient

import app.repositories.user_repository as _user_repo
from app.main import app
from app.core.database import get_db as core_get_db
from app.db.session import get_db as session_get_db
from app.core import security


# ── Fake async session ────────────────────────────────────────────────────────

class FakeAsyncSession:
    """No-op session: satisfies commit/refresh/rollback calls without a real DB."""
    async def commit(self): pass
    async def rollback(self): pass
    async def refresh(self, obj): pass
    def add(self, obj): pass
    async def flush(self): pass


async def fake_get_db():
    yield FakeAsyncSession()


# ── In-memory user store ──────────────────────────────────────────────────────

@dataclass
class FakeUser:
    id: int
    email: str
    hashed_password: str
    full_name: str
    role: str = "guest"
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.now)


class _UserStore:
    def __init__(self):
        self._users: dict[int, FakeUser] = {}
        self._next_id = 1000  # avoids clash with MockBookingRepository seeded user_ids

    def clear(self):
        self._users.clear()
        self._next_id = 1000

    def get_by_email(self, email: str):
        return next((u for u in self._users.values() if u.email == email), None)

    def get_by_id(self, user_id: int):
        return self._users.get(user_id)

    def create(self, data: dict) -> FakeUser:
        user = FakeUser(
            id=self._next_id,
            email=data["email"],
            hashed_password=data["hashed_password"],
            full_name=data["full_name"],
            role=data.get("role", "guest"),
        )
        self._next_id += 1
        self._users[user.id] = user
        return user

    def update(self, user_id: int, data: dict):
        user = self._users.get(user_id)
        if not user:
            return None
        for key, value in data.items():
            setattr(user, key, value)
        return user


# ── Async mock booking repository ─────────────────────────────────────────────

class AsyncMockBookingRepository:
    """Async wrapper over MockBookingRepository for use in integration tests."""

    def __init__(self):
        from app.repositories.booking_repository import MockBookingRepository
        self._mock = MockBookingRepository()

    async def get_room(self, room_id: int):
        return self._mock.get_room_by_id(room_id)

    async def get_room_by_id(self, room_id: int):
        return self._mock.get_room_by_id(room_id)

    async def get_overlapping_bookings(self, room_id: int, check_in: date, check_out: date):
        bookings = self._mock.get_bookings_for_room(room_id)
        return [
            b for b in bookings
            if b.status in ("pending", "confirmed")
            and b.start_date < check_out
            and check_in < b.end_date
        ]

    async def create_booking(self, data: dict):
        return self._mock.create_booking(data)

    async def get_booking_by_id(self, booking_id: int):
        return self._mock.get_booking_by_id(booking_id)

    async def update_booking_status(self, booking_id: int, status: str):
        return self._mock.update_booking_status(booking_id, status)

    async def get_bookings_for_user(self, user_id: int):
        return self._mock.get_bookings_for_user(user_id)

    async def get_all_bookings(self):
        return list(self._mock._bookings)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def user_store():
    store = _UserStore()
    yield store
    store.clear()


@pytest.fixture(autouse=True)
def patch_user_repo(monkeypatch, user_store):
    """Replace user_repository functions with in-memory equivalents for every test."""

    async def fake_get_by_email(session, email):
        return user_store.get_by_email(email)

    async def fake_get_by_id(session, user_id):
        return user_store.get_by_id(user_id)

    async def fake_create_user(session, data):
        return user_store.create(data)

    async def fake_update_user(session, user_id, update_data):
        return user_store.update(user_id, update_data)

    monkeypatch.setattr(_user_repo, "get_by_email", fake_get_by_email)
    monkeypatch.setattr(_user_repo, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(_user_repo, "create_user", fake_create_user)
    monkeypatch.setattr(_user_repo, "update_user", fake_update_user)


@pytest.fixture(autouse=True)
def clear_auth_stores():
    """Clear module-level auth stores between tests to prevent state leakage."""
    from app.services import auth_service
    auth_service._token_blacklist.clear()
    auth_service._reset_tokens.clear()
    yield
    auth_service._token_blacklist.clear()
    auth_service._reset_tokens.clear()


@pytest.fixture
def booking_repo():
    return AsyncMockBookingRepository()


@pytest.fixture
def client(booking_repo, monkeypatch):
    from app.api.v1.bookings import get_booking_repo as bookings_get_repo
    from app.api.v1.admin import get_booking_repo as admin_get_repo
    import app.main as _main

    async def _noop(*args, **kwargs):
        pass

    monkeypatch.setattr(_main, "create_all_tables", _noop)
    monkeypatch.setattr(_main, "run_seed", _noop)

    repo_override = lambda: booking_repo  # noqa: E731

    app.dependency_overrides[core_get_db] = fake_get_db
    app.dependency_overrides[session_get_db] = fake_get_db
    app.dependency_overrides[bookings_get_repo] = repo_override
    app.dependency_overrides[admin_get_repo] = repo_override

    try:
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    """Register a test guest user and return Bearer Authorization headers."""
    resp = client.post("/api/v1/auth/register", json={
        "name": "Integration Test User",
        "email": "inttest@ejust.edu.eg",
        "password": "password123",
    })
    assert resp.status_code == 201, f"Register failed: {resp.json()}"
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
def admin_headers(user_store):
    """Insert an admin user directly into the store and return Bearer headers."""
    admin = user_store.create({
        "email": "admin-test@ejust.edu.eg",
        "hashed_password": "x",
        "full_name": "Integration Test Admin",
        "role": "admin",
    })
    token = security.create_access_token({"sub": str(admin.id)})
    return {"Authorization": f"Bearer {token}"}
