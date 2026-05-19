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
