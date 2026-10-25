"""
Security tests for the /api/admin dashboard router.

These routes return guest PII (names, phones, national IDs) and can create or
delete rooms, so every one of them must reject anonymous and non-admin callers.
"""
import pytest

from app.repositories.admin_repo import AdminRepository

ADMIN_ENDPOINTS = [
    ("get", "/api/admin/rooms"),
    ("get", "/api/admin/bookings"),
    ("post", "/api/admin/rooms"),
    ("patch", "/api/admin/rooms/1"),
    ("delete", "/api/admin/rooms/1"),
    ("post", "/api/admin/bookings/manual"),
    ("patch", "/api/admin/bookings/1"),
    ("patch", "/api/admin/bookings/1/status"),
]


@pytest.mark.parametrize("method,path", ADMIN_ENDPOINTS)
def test_admin_endpoint_rejects_anonymous(client, method, path):
    resp = getattr(client, method)(path)
    assert resp.status_code == 401


@pytest.mark.parametrize("method,path", ADMIN_ENDPOINTS)
def test_admin_endpoint_rejects_guest(client, auth_headers, method, path):
    resp = getattr(client, method)(path, headers=auth_headers)
    assert resp.status_code == 403


def test_admin_endpoint_rejects_garbage_token(client):
    resp = client.get("/api/admin/bookings", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401


def test_admin_can_list_rooms(client, admin_headers, monkeypatch):
    async def fake_get_all_rooms(self, skip=0, limit=200):
        return []
    monkeypatch.setattr(AdminRepository, "get_all_rooms", fake_get_all_rooms)

    resp = client.get("/api/admin/rooms", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json() == []
