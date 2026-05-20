"""
Integration tests for /auth/register and /auth/login.
TestClient → real FastAPI routes → real AuthService → in-memory user store.
No real database — user_repository is monkeypatched via conftest.
"""

from __future__ import annotations

import pytest


# ── /auth/register ────────────────────────────────────────────────────────────

def test_register_guest_successfully(client):
    resp = client.post("/api/v1/auth/register", json={
        "name": "Yassin Mahmoud",
        "email": "yassin@ejust.edu.eg",
        "password": "password123",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "yassin@ejust.edu.eg"


def test_register_duplicate_email_returns_409(client):
    payload = {"name": "Alice", "email": "dup@ejust.edu.eg", "password": "password123"}
    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409


def test_register_missing_fields_returns_422(client):
    resp = client.post("/api/v1/auth/register", json={})
    assert resp.status_code == 422


# ── /auth/login ───────────────────────────────────────────────────────────────

def test_login_with_valid_credentials_returns_token(client):
    client.post("/api/v1/auth/register", json={
        "name": "Bob", "email": "bob@ejust.edu.eg", "password": "mypassword1",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": "bob@ejust.edu.eg", "password": "mypassword1",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_with_wrong_password_returns_401(client):
    client.post("/api/v1/auth/register", json={
        "name": "Carol", "email": "carol@ejust.edu.eg", "password": "rightpassword",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": "carol@ejust.edu.eg", "password": "wrongpassword",
    })
    assert resp.status_code == 401


def test_login_with_nonexistent_email_returns_401(client):
    resp = client.post("/api/v1/auth/login", json={
        "email": "ghost@ejust.edu.eg", "password": "anypassword",
    })
    assert resp.status_code == 401


# ── Protected route auth guards ───────────────────────────────────────────────

def test_protected_route_without_token_returns_401(client):
    resp = client.get("/api/v1/rooms/")
    assert resp.status_code == 401


def test_protected_route_with_invalid_token_returns_401(client):
    resp = client.get("/api/v1/rooms/", headers={"Authorization": "Bearer invalidtoken"})
    assert resp.status_code == 401


# ── /auth/logout ──────────────────────────────────────────────────────────────

def test_logout_returns_success(client, auth_headers):
    resp = client.post("/api/v1/auth/logout", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Logged out successfully"


def test_logout_invalidates_token(client, auth_headers):
    client.post("/api/v1/auth/logout", headers=auth_headers)
    resp = client.patch("/api/v1/auth/me", json={}, headers=auth_headers)
    assert resp.status_code == 401


def test_logout_without_token_returns_401(client):
    resp = client.post("/api/v1/auth/logout")
    assert resp.status_code == 401


# ── /auth/forgot-password ─────────────────────────────────────────────────────

def test_forgot_password_returns_token_for_known_email(client):
    client.post("/api/v1/auth/register", json={
        "name": "Dina", "email": "dina@ejust.edu.eg", "password": "password123",
    })
    resp = client.post("/api/v1/auth/forgot-password", json={"email": "dina@ejust.edu.eg"})
    assert resp.status_code == 200
    body = resp.json()
    assert "reset_token" in body
    assert len(body["reset_token"]) > 10


def test_forgot_password_returns_token_for_unknown_email(client):
    resp = client.post("/api/v1/auth/forgot-password", json={"email": "nobody@ejust.edu.eg"})
    assert resp.status_code == 200
    assert "reset_token" in resp.json()


# ── /auth/reset-password ──────────────────────────────────────────────────────

def test_reset_password_with_valid_token(client):
    client.post("/api/v1/auth/register", json={
        "name": "Eman", "email": "eman@ejust.edu.eg", "password": "oldpassword1",
    })
    fp_resp = client.post("/api/v1/auth/forgot-password", json={"email": "eman@ejust.edu.eg"})
    reset_token = fp_resp.json()["reset_token"]

    reset_resp = client.post("/api/v1/auth/reset-password", json={
        "token": reset_token, "new_password": "newpassword1",
    })
    assert reset_resp.status_code == 200

    login_resp = client.post("/api/v1/auth/login", json={
        "email": "eman@ejust.edu.eg", "password": "newpassword1",
    })
    assert login_resp.status_code == 200


def test_reset_password_with_invalid_token_returns_400(client):
    resp = client.post("/api/v1/auth/reset-password", json={
        "token": "completely-fake-token", "new_password": "newpassword1",
    })
    assert resp.status_code == 400
    assert resp.json()["detail"]["error_code"] == "INVALID_RESET_TOKEN"


def test_reset_token_is_one_time_use(client):
    client.post("/api/v1/auth/register", json={
        "name": "Farid", "email": "farid@ejust.edu.eg", "password": "firstpassword1",
    })
    fp_resp = client.post("/api/v1/auth/forgot-password", json={"email": "farid@ejust.edu.eg"})
    token = fp_resp.json()["reset_token"]

    client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "newpassword1"})
    second = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "yetanother1"})
    assert second.status_code == 400


# ── /auth/me (PATCH) ──────────────────────────────────────────────────────────

def test_update_full_name(client, auth_headers):
    resp = client.patch("/api/v1/auth/me", json={"full_name": "Updated Name"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Updated Name"


def test_update_email_to_available_address(client, auth_headers):
    resp = client.patch("/api/v1/auth/me", json={"email": "newemail@ejust.edu.eg"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "newemail@ejust.edu.eg"


def test_update_email_to_taken_address_returns_409(client, auth_headers):
    client.post("/api/v1/auth/register", json={
        "name": "Gamila", "email": "gamila@ejust.edu.eg", "password": "password123",
    })
    resp = client.patch("/api/v1/auth/me", json={"email": "gamila@ejust.edu.eg"}, headers=auth_headers)
    assert resp.status_code == 409
    assert resp.json()["detail"]["error_code"] == "EMAIL_CONFLICT"


def test_update_password_with_correct_current_password(client, auth_headers):
    resp = client.patch("/api/v1/auth/me", json={
        "password": "newpassword1", "current_password": "password123",
    }, headers=auth_headers)
    assert resp.status_code == 200


def test_update_password_with_wrong_current_password_returns_401(client, auth_headers):
    resp = client.patch("/api/v1/auth/me", json={
        "password": "newpassword1", "current_password": "wrongcurrent",
    }, headers=auth_headers)
    assert resp.status_code == 401


def test_update_profile_requires_authentication(client):
    resp = client.patch("/api/v1/auth/me", json={"full_name": "Hacker"})
    assert resp.status_code == 401


def test_update_profile_with_empty_body_returns_current_user(client, auth_headers):
    resp = client.patch("/api/v1/auth/me", json={}, headers=auth_headers)
    assert resp.status_code == 200
    assert "email" in resp.json()
