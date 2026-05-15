import pytest
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.api.deps import get_db, get_current_user
from app.db.base import Base
from app.models.room import Room
from app.models.booking import Booking

pytestmark = pytest.mark.asyncio

# Use a real PostgreSQL database for integration tests.
# This is required because we use PostgreSQL-specific features like ARRAY and GiST indexes.
# Ensure you have a test database running, e.g., via docker-compose.
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/test_hotel_db"

engine_test = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(engine_test, class_=AsyncSession, expire_on_commit=False)

@pytest.fixture(scope="session", autouse=True)
async def setup_test_db():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def integration_session(setup_test_db):
    """Yields a database session to be used directly in integration tests if needed."""
    async with TestingSessionLocal() as session:
        yield session

@pytest.fixture
async def async_client(setup_test_db):
    """FastAPI TestClient with overridden dependencies."""
    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session

    def override_get_current_user():
        return User(id=1, name="Integration Test User", email="test@test.com", role="guest")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()

from datetime import date, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.room import Room
from app.models.booking import Booking

pytestmark = pytest.mark.asyncio

async def test_integration_create_room_and_book_it(async_client: AsyncClient, integration_session: AsyncSession):
    # 1. Seed a room directly in the DB
    room = Room(
        room_number="INT-101",
        room_type="single",
        capacity=1,
        price_per_night=100.0,
        status="available"
    )
    integration_session.add(room)
    await integration_session.commit()
    await integration_session.refresh(room)

    # 2. Check if room is available via API
    res = await async_client.get(f"/api/v1/rooms/{room.id}")
    assert res.status_code == 200
    assert res.json()["room_number"] == "INT-101"

    # 3. Create a booking via API (testing the lock and logic)
    check_in = date.today() + timedelta(days=5)
    check_out = date.today() + timedelta(days=10)
    
    payload = {
        "room_id": room.id,
        "check_in_date": check_in.isoformat(),
        "check_out_date": check_out.isoformat(),
        "special_requests": "Window view"
    }
    
    res = await async_client.post("/api/v1/bookings/", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["total_price"] == 500.0
    assert data["status"] == "confirmed"

    # 4. Attempt to double-book the same exact dates
    res2 = await async_client.post("/api/v1/bookings/", json=payload)
    # The API should reject this due to overlap lock
    assert res2.status_code == 409
    assert "not available" in res2.json()["detail"]
