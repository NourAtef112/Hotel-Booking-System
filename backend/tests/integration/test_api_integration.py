"""
Integration test: exercises GET /api/v1/rooms against the real Supabase DB.

- Auth: JWT is resolved via the in-memory user store (autouse patch_user_repo
  from conftest already patches user_repository.get_by_id — no real DB needed
  for the auth step).
- Rooms: room_service hits the real Supabase DB session from app.db.session.

Run in isolation with: pytest -m integration
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core import security


@pytest.mark.integration
async def test_rooms_endpoint_returns_non_empty_list(user_store):
    """GET /api/v1/rooms returns 200 with at least one seeded room from Supabase."""
    user = user_store.create({
        "email": "integration-test@ejust.edu.eg",
        "hashed_password": "x",
        "full_name": "Integration Test User",
        "role": "admin",
    })
    token = security.create_access_token({"sub": str(user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        follow_redirects=True,
    ) as client:
        response = await client.get("/api/v1/rooms", headers=headers)

    assert response.status_code == 200, f"Unexpected status: {response.json()}"
    data = response.json()
    assert "rooms" in data, f"Expected 'rooms' key in response: {data}"
    assert len(data["rooms"]) > 0, "At least one seeded room must exist in Supabase"
