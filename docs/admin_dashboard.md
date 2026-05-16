# Admin Dashboard API — feature/admin-dashboard-postgres

## Section 1: Overview

This feature implements the admin-only REST API for the University Guest Housing Booking System. It gives administrators the ability to view all bookings, create new rooms, and manually assign bookings on behalf of guests — without requiring guests to be authenticated.

**Audience:** Admin users only. Access is enforced at the HTTP layer via JWT role checks.

**Tech stack:**
- FastAPI — HTTP framework and OpenAPI/Swagger generation
- PostgreSQL 18 — primary database
- SQLAlchemy (async) — ORM and query layer
- Pydantic v2 — request/response validation (DTOs)
- argon2-cffi — password hashing
- python-jose — JWT encode/decode
- HTTPBearer — Swagger-compatible token injection

**Branch:** `feature/admin-dashboard-postgres`
**Purpose:** Deliver a fully wired, PostgreSQL-backed admin dashboard API with layered architecture, role-based auth, and verified test coverage.

---

## Section 2: Architecture

### Layer Responsibilities

```
schemas/admin.py          → Pydantic DTOs (request/response validation)
repositories/admin_repo.py → DB queries only — no HTTP, no commits
api/admin_routes.py        → HTTP endpoints — calls repo, commits, maps fields
core/security.py           → JWT encode/decode + argon2 password hashing
api/deps.py                → HTTPBearer dependency + get_current_user
```

Each layer has a single responsibility. The router owns the transaction boundary (`session.commit()`); the repository owns the SQL.

### Field Mappings

These mappings were discovered during implementation and are non-obvious from the schema alone:

| Source (schema/request) | Target (ORM model) | Note |
|---|---|---|
| `RoomCreate.type` | `Room.room_type` | enum: single/double/suite/twin |
| *(not in schema)* | `Room.capacity` | defaults to `1` — NOT NULL column |
| `ManualBookingCreate.start_date` | `Booking.check_in_date` | parsed via `date.fromisoformat()` |
| `ManualBookingCreate.end_date` | `Booking.check_out_date` | parsed via `date.fromisoformat()` |
| `ManualBookingCreate.guest_name` | `Booking.special_requests` | stored as `"Manual booking for guest: <name>"` |
| *(no is_admin bool)* | `User.role` | string `"admin"` — compared with `== "admin"` |

---

## Section 3: API Endpoints

All endpoints are prefixed with `/api/admin` and require a valid admin JWT.

### GET /api/admin/bookings

Returns a paginated list of every booking in the system.

**Auth:** Admin JWT required (HTTPBearer)

**Query params:**
- `skip` (int, default 0)
- `limit` (int, default 100)

**Responses:**

| Status | Condition |
|---|---|
| 200 OK | Valid admin token — returns `list[BookingResponse]` |
| 401 Unauthorized | No token provided |
| 403 Forbidden | Valid token but user is not admin |

**Response body (200):**
```json
[
  {
    "id": 1,
    "guest_name": "John Smith",
    "room_id": 1,
    "start_date": "2026-06-01",
    "end_date": "2026-06-05",
    "status": "confirmed"
  }
]
```

---

### POST /api/admin/rooms

Creates a new guest housing room record in PostgreSQL.

**Auth:** Admin JWT required (HTTPBearer)

**Request body:**
```json
{
  "room_number": "A101",
  "type": "single",
  "price_per_night": 50.0
}
```

Available values for `type`: `single`, `double`, `suite`, `twin`

**Responses:**

| Status | Condition |
|---|---|
| 201 Created | Room created — returns `RoomResponse` |
| 401 Unauthorized | No token provided |
| 403 Forbidden | Valid token but user is not admin |
| 422 Unprocessable Entity | Invalid or missing fields |

**Response body (201):**
```json
{
  "id": 2,
  "room_number": "A101",
  "type": "single",
  "price_per_night": 50.0
}
```

---

### POST /api/admin/bookings/manual

Creates a booking on behalf of a named guest. The admin's user ID is used as the booking owner. Guest name is stored in `special_requests`.

**Auth:** Admin JWT required (HTTPBearer)

**Request body:**
```json
{
  "guest_name": "John Smith",
  "room_id": 1,
  "start_date": "2026-06-01",
  "end_date": "2026-06-05"
}
```

Dates must be in `YYYY-MM-DD` format. `end_date` must be after `start_date`.

**Responses:**

| Status | Condition |
|---|---|
| 201 Created | Booking created — returns `BookingResponse` |
| 401 Unauthorized | No token provided |
| 403 Forbidden | Valid token but user is not admin |
| 422 Unprocessable Entity | Missing fields or invalid date format/order |

**Response body (201):**
```json
{
  "id": 2,
  "guest_name": "John Smith",
  "room_id": 1,
  "start_date": "2026-06-01",
  "end_date": "2026-06-05",
  "status": "confirmed"
}
```

---

## Section 4: How to Run

### Step 1: Prerequisites

- Python 3.11+
- PostgreSQL 18
- pgAdmin 4 (Windows desktop app)

### Step 2: Environment Setup

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/guest_housing
SECRET_KEY=your_secret_key
DEBUG=True
```

### Step 3: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
pip install argon2-cffi psycopg2-binary
```

### Step 4: Create Database

```bash
psql -U postgres -c "CREATE DATABASE guest_housing;"
psql -U postgres -d guest_housing -c "CREATE EXTENSION IF NOT EXISTS btree_gist;"
```

### Step 5: Run Migrations

```bash
cd backend
python -m alembic upgrade head
```

### Step 6: Start Backend

```bash
cd backend
python -m uvicorn main:app --reload
```

### Step 7: Open Swagger

```
http://localhost:8000/api/docs
```

---

## Section 5: How to Add an Admin User

### Method 1: Register then promote

**Step 1** — Register via Swagger `POST /api/auth/register`:

```json
{
  "full_name": "Admin Name",
  "email": "admin@test.com",
  "password": "Admin1234!",
  "role": "guest"
}
```

**Step 2** — Promote the user in the terminal:

```bash
psql -U postgres -d guest_housing -c \
  "UPDATE users SET role='admin' WHERE email='admin@test.com';"
```

### Method 2: Direct insert via Python

```python
python -c "
from argon2 import PasswordHasher
import psycopg2
ph = PasswordHasher()
conn = psycopg2.connect(host='localhost', port=5432,
    database='guest_housing', user='postgres', password='YOUR_PASSWORD')
cur = conn.cursor()
cur.execute(
    'INSERT INTO users (full_name, email, password_hash, role, is_verified, is_active) VALUES (%s,%s,%s,%s,%s,%s)',
    ('Admin Name', 'admin@test.com', ph.hash('Admin1234!'), 'admin', True, True))
conn.commit()
print('Admin created')
cur.close()
conn.close()
"
```

---

## Section 6: How to Add a Room

### Method 1: Via Swagger (recommended)

1. `POST /api/auth/login` — log in and copy the `access_token`
2. Click **Authorize** → paste the token in the **Value** field
3. `POST /api/admin/rooms` with body:

```json
{
  "room_number": "A101",
  "type": "single",
  "price_per_night": 50.0
}
```

4. Execute → `201 Created`

Available room types: `single`, `double`, `suite`, `twin`

### Method 2: Via PowerShell

```powershell
$token = "YOUR_ADMIN_TOKEN"
Invoke-WebRequest -Uri "http://localhost:8000/api/admin/rooms" `
  -Method POST `
  -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} `
  -Body '{"room_number":"A101","type":"single","price_per_night":50.0}' `
  | Select-Object -ExpandProperty Content
```

---

## Section 7: How to Manually Assign a Booking

Via Swagger `POST /api/admin/bookings/manual`:

```json
{
  "guest_name": "John Smith",
  "room_id": 1,
  "start_date": "2026-06-01",
  "end_date": "2026-06-05"
}
```

Expected response: `201 Created`

---

## Section 8: Verification & Test Results

**All tests passed on:** 2026-05-16
**Branch:** `feature/admin-dashboard-postgres`

### Terminal Tests

```
GET  /api/admin/bookings → 200 admin / 401 no token / 403 user  ✅
POST /api/admin/rooms    → 201 created / 422 bad data / 403 user ✅
POST /api/admin/bookings/manual → 201 created / 422 missing / 403 user ✅
```

### Swagger Tests (HTTPBearer)

```
GET  /api/admin/bookings        → 200 OK      ✅
POST /api/admin/rooms           → 201 Created ✅
POST /api/admin/bookings/manual → 201 Created ✅
Logout → 401 Unauthorized       ✅
```

### pgAdmin Verification

```
rooms table    → new rows confirmed ✅
bookings table → new rows confirmed ✅
```

---

## Section 9: Known Issues & Bugs

### BUG-001 — Critical: Route prefix mismatch
Spec documents `/api/auth` but code uses `/auth`.
**Status:** Logged, not blocking current feature.

### BUG-002 — Critical: All handlers were stubs
All endpoints returned 500 before implementation.
**Status:** Fixed in this branch.

### BUG-003 — High: No JWT auth middleware initially
Any request was accepted unauthenticated.
**Status:** Fixed — `HTTPBearer` added in `deps.py`.

### BUG-004 — Medium: passlib incompatible with Python 3.14
`bcrypt`/`passlib` crashes on Python 3.14 due to internal API changes.
**Status:** Fixed — replaced with `argon2-cffi`.

### BUG-005 — Medium: btree_gist extension missing
Alembic migration failed on fresh databases without the extension.
**Status:** Fixed — `CREATE EXTENSION IF NOT EXISTS btree_gist` added to setup steps.

---

## Section 10: Security Notes

- All admin routes are protected by `HTTPBearer` JWT validation.
- Passwords are hashed with `argon2` (not `bcrypt` — see BUG-004).
- The `role` field is the string `"admin"`, not a boolean `is_admin`.
- Never commit `.env` to version control.
- Never commit `venv/` to version control.
