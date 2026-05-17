"""
Integration tests for /rooms and /bookings routes.
room_service is monkeypatched to return in-memory mock data (no real DB).
MockBookingRepository handles all booking state in-memory.
"""

from __future__ import annotations

import pytest
import app.services.room_service as _room_svc

# ── Shared mock room data (matches RoomResponse schema) ──────────────────────

_MOCK_ROOMS = [
    {"id": 1, "name": "GH-101", "room_type": "single", "capacity": 1,
     "price_per_night": 250.0, "status": "available",
     "amenities": ["AC", "WiFi"], "description": "Single room", "image_url": None},
    {"id": 2, "name": "GH-102", "room_type": "single", "capacity": 1,
     "price_per_night": 250.0, "status": "available",
     "amenities": ["AC", "WiFi"], "description": "Single room", "image_url": None},
    {"id": 3, "name": "GH-201", "room_type": "double", "capacity": 2,
     "price_per_night": 400.0, "status": "available",
     "amenities": ["AC", "WiFi", "Mini Fridge"], "description": "Double room", "image_url": None},
    {"id": 4, "name": "GH-202", "room_type": "suite", "capacity": 2,
     "price_per_night": 600.0, "status": "occupied",
     "amenities": ["AC", "WiFi", "TV"], "description": "Suite", "image_url": None},
    {"id": 5, "name": "GH-301", "room_type": "suite", "capacity": 2,
     "price_per_night": 900.0, "status": "available",
     "amenities": ["AC", "WiFi", "Kitchen"], "description": "VIP Suite", "image_url": None},
]

_ROOMS_BY_ID = {r["id"]: r for r in _MOCK_ROOMS}


@pytest.fixture(autouse=True)
def mock_room_service(monkeypatch):
    """Monkeypatch room_service to avoid real DB queries for every test in this module."""
    from fastapi import HTTPException

    async def fake_get_rooms(session, available=None, room_type=None, page=1, page_size=10):
        return {"rooms": _MOCK_ROOMS, "total": len(_MOCK_ROOMS)}

    async def fake_get_room_by_id(session, room_id: int):
        room = _ROOMS_BY_ID.get(room_id)
        if room is None:
            raise HTTPException(status_code=404, detail="Room not found")
        return room

    monkeypatch.setattr(_room_svc, "get_rooms", fake_get_rooms)
    monkeypatch.setattr(_room_svc, "get_room_by_id", fake_get_room_by_id)


# ── Rooms ─────────────────────────────────────────────────────────────────────

def test_get_all_rooms_returns_seeded_rooms(client, auth_headers):
    resp = client.get("/api/v1/rooms/", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 5
    assert len(body["rooms"]) == 5


def test_get_room_by_id_returns_correct_room(client, auth_headers):
    resp = client.get("/api/v1/rooms/1", headers=auth_headers)
    assert resp.status_code == 200
    room = resp.json()
    assert room["id"] == 1
    assert room["name"] == "GH-101"
    assert room["price_per_night"] == 250.0


def test_get_room_not_found_returns_404(client, auth_headers):
    resp = client.get("/api/v1/rooms/99999", headers=auth_headers)
    assert resp.status_code == 404


# ── Bookings ──────────────────────────────────────────────────────────────────

def test_create_booking_successfully(client, auth_headers):
    resp = client.post("/api/v1/bookings/", headers=auth_headers, json={
        "room_id": 2,
        "start_date": "2026-07-01",
        "end_date": "2026-07-05",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "pending"
    assert body["room_id"] == 2


def test_create_booking_sets_user_id_from_token(client):
    reg = client.post("/api/v1/auth/register", json={
        "name": "Nour Atef", "email": "nour@ejust.edu.eg", "password": "password123",
    })
    assert reg.status_code == 201
    user_id = reg.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    resp = client.post("/api/v1/bookings/", headers=headers, json={
        "room_id": 2, "start_date": "2026-07-01", "end_date": "2026-07-05",
    })
    assert resp.status_code == 201
    assert resp.json()["user_id"] == user_id


def test_create_booking_overlap_returns_409(client, auth_headers):
    payload = {"room_id": 2, "start_date": "2026-07-10", "end_date": "2026-07-15"}
    first = client.post("/api/v1/bookings/", headers=auth_headers, json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/bookings/", headers=auth_headers, json=payload)
    assert second.status_code == 409


def test_create_booking_missing_fields_returns_422(client, auth_headers):
    resp = client.post("/api/v1/bookings/", headers=auth_headers, json={})
    assert resp.status_code == 422


def test_get_my_bookings_returns_only_own_bookings(client):
    reg_a = client.post("/api/v1/auth/register", json={
        "name": "User A", "email": "usera@ejust.edu.eg", "password": "password123",
    })
    assert reg_a.status_code == 201
    user_a_id = reg_a.json()["user"]["id"]
    headers_a = {"Authorization": f"Bearer {reg_a.json()['access_token']}"}

    reg_b = client.post("/api/v1/auth/register", json={
        "name": "User B", "email": "userb@ejust.edu.eg", "password": "password123",
    })
    assert reg_b.status_code == 201
    headers_b = {"Authorization": f"Bearer {reg_b.json()['access_token']}"}

    # User A books room 2, User B books room 3 (different dates to avoid overlap)
    r1 = client.post("/api/v1/bookings/", headers=headers_a, json={
        "room_id": 2, "start_date": "2026-08-01", "end_date": "2026-08-05",
    })
    assert r1.status_code == 201

    r2 = client.post("/api/v1/bookings/", headers=headers_b, json={
        "room_id": 3, "start_date": "2026-08-10", "end_date": "2026-08-14",
    })
    assert r2.status_code == 201

    resp = client.get("/api/v1/bookings/me", headers=headers_a)
    assert resp.status_code == 200
    bookings = resp.json()
    assert len(bookings) == 1
    assert bookings[0]["user_id"] == user_a_id


def test_get_my_bookings_empty_if_no_bookings(client, auth_headers):
    resp = client.get("/api/v1/bookings/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []
