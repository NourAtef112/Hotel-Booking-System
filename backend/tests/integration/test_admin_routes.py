"""
Integration tests for /admin routes.
Admin endpoints require role=admin JWT; guest access returns 403.
MockBookingRepository handles booking state in-memory.
"""

from __future__ import annotations

import pytest


# ── Helper: create a pending booking as the guest user ───────────────────────

def _create_booking(client, auth_headers, room_id=2, start="2026-09-01", end="2026-09-05"):
    resp = client.post("/api/v1/bookings/", headers=auth_headers, json={
        "room_id": room_id,
        "start_date": start,
        "end_date": end,
    })
    assert resp.status_code == 201, f"Booking creation failed: {resp.json()}"
    return resp.json()


# ── GET /admin/bookings ───────────────────────────────────────────────────────

def test_admin_can_get_all_bookings(client, admin_headers):
    resp = client.get("/api/v1/admin/bookings", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_guest_cannot_access_admin_bookings_returns_403(client, auth_headers):
    resp = client.get("/api/v1/admin/bookings", headers=auth_headers)
    assert resp.status_code == 403


def test_unauthenticated_cannot_access_admin_bookings_returns_401(client):
    resp = client.get("/api/v1/admin/bookings")
    assert resp.status_code == 401


# ── PATCH /admin/bookings/{id} ────────────────────────────────────────────────

def test_admin_can_confirm_booking(client, auth_headers, admin_headers):
    booking = _create_booking(client, auth_headers)
    booking_id = booking["id"]

    resp = client.patch(
        f"/api/v1/admin/bookings/{booking_id}",
        headers=admin_headers,
        json={"status": "confirmed"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "confirmed"


def test_admin_can_reject_booking(client, auth_headers, admin_headers):
    booking = _create_booking(client, auth_headers, room_id=3, start="2026-09-10", end="2026-09-14")
    booking_id = booking["id"]

    resp = client.patch(
        f"/api/v1/admin/bookings/{booking_id}",
        headers=admin_headers,
        json={"status": "rejected"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


def test_admin_cannot_confirm_already_cancelled_booking(client, auth_headers, admin_headers):
    booking = _create_booking(client, auth_headers, room_id=2, start="2026-10-01", end="2026-10-05")
    booking_id = booking["id"]

    # Cancel the booking (pending → cancelled is allowed)
    cancel = client.patch(
        f"/api/v1/admin/bookings/{booking_id}",
        headers=admin_headers,
        json={"status": "cancelled"},
    )
    assert cancel.status_code == 200

    # Try to confirm a cancelled booking — terminal state
    confirm = client.patch(
        f"/api/v1/admin/bookings/{booking_id}",
        headers=admin_headers,
        json={"status": "confirmed"},
    )
    assert confirm.status_code == 422


def test_patch_nonexistent_booking_returns_404(client, admin_headers):
    resp = client.patch(
        "/api/v1/admin/bookings/99999",
        headers=admin_headers,
        json={"status": "confirmed"},
    )
    assert resp.status_code == 404
