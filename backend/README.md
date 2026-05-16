# University Guest Housing — Backend

FastAPI + PostgreSQL async backend for the University Guest Housing Booking System.

- **Python 3.14** compatible
- **Argon2** password hashing
- **JWT** authentication
- **SQLAlchemy 2.0** async ORM
- **Alembic** migrations
- **Pydantic v2** schemas

---

## Folder Structure

```
backend/
├── main.py                    → FastAPI app entry point
├── alembic.ini                → Migration config
├── pytest.ini                 → Test config
├── requirements.txt           → Dependencies
├── .env                       → Environment variables (never commit)
├── .env.example               → Template for .env
├── alembic/                   → Database migrations
│   └── versions/              → Migration files
├── app/
│   ├── api/
│   │   ├── auth_routes.py     → Auth endpoints (register, login)
│   │   ├── admin_routes.py    → Admin endpoints
│   │   ├── room_routes.py     → Room endpoints
│   │   ├── booking_routes.py  → Booking endpoints
│   │   └── deps.py            → JWT HTTPBearer dependency
│   ├── core/
│   │   ├── config.py          → App settings
│   │   ├── security.py        → JWT + argon2 hashing
│   │   └── session.py         → DB session setup
│   ├── models/
│   │   ├── user.py            → User SQLAlchemy model
│   │   ├── room.py            → Room SQLAlchemy model
│   │   └── booking.py         → Booking SQLAlchemy model
│   ├── repositories/
│   │   ├── user_repository.py → User DB queries
│   │   ├── room_repository.py → Room DB queries
│   │   ├── booking_repository.py → Booking DB queries
│   │   └── admin_repo.py      → Admin DB queries
│   └── schemas/
│       ├── auth_schemas.py    → Auth DTOs
│       ├── admin.py           → Admin DTOs
│       └── room_schemas.py    → Room DTOs
└── tests/
    ├── test_auth.py           → Auth tests
    └── test_booking.py        → Booking tests
```

---

## Prerequisites

- Python 3.11 or higher (tested on 3.14.4)
- PostgreSQL 18
- pgAdmin 4 (Windows)
- pip 23+

---

## Installation & Setup

### Step 1: Navigate to backend

```bash
cd backend
```

### Step 2: Install dependencies

```bash
pip install -r requirements.txt
pip install argon2-cffi psycopg2-binary
```

### Step 3: Create .env file

```bash
cp .env.example .env
```

Fill in these values:

```env
DEBUG=True
ENVIRONMENT=development
SECRET_KEY=your_random_secret_key
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/guest_housing
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8081"]
API_BASE_URL=http://localhost:8000
```

### Step 4: Create database

```bash
psql -U postgres -c "CREATE DATABASE guest_housing;"
psql -U postgres -d guest_housing -c "CREATE EXTENSION IF NOT EXISTS btree_gist;"
```

### Step 5: Run migrations

```bash
python -m alembic upgrade head
```

### Step 6: Start server

```bash
python -m uvicorn main:app --reload
```

### Step 7: Open API docs

```
http://localhost:8000/api/docs
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DEBUG` | Enable debug mode | `True` |
| `ENVIRONMENT` | App environment | `development` |
| `SECRET_KEY` | JWT signing key | `random_string` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql+asyncpg://...` |
| `ALLOWED_ORIGINS` | CORS origins | `["http://localhost:3000"]` |
| `API_BASE_URL` | Backend URL | `http://localhost:8000` |

---

## API Routes Summary

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register user |
| POST | `/api/auth/login` | None | Login + get token |
| GET | `/api/auth/me` | JWT | Get current user |
| GET | `/api/rooms` | None | List all rooms |
| GET | `/api/admin/bookings` | Admin JWT | All bookings |
| POST | `/api/admin/rooms` | Admin JWT | Create room |
| POST | `/api/admin/bookings/manual` | Admin JWT | Manual booking |

---

## Authentication

JWT Bearer token flow:

1. `POST /api/auth/login` → receive `access_token`
2. Add to every protected request:
   ```
   Authorization: Bearer YOUR_TOKEN
   ```
3. Token expires after the configured number of minutes
4. Obtain a new token by logging in again

**In Swagger:**

1. `POST /api/auth/login` → copy `access_token`
2. Click **Authorize** → paste token in the **Value** field
3. All protected routes will now include the token automatically

---

## Database

PostgreSQL 18 with async SQLAlchemy 2.0.

**Migration commands:**

```bash
python -m alembic upgrade head    # apply all pending migrations
python -m alembic downgrade -1    # roll back one migration
python -m alembic current         # check current migration status
```

**Tables:**

| Table | Purpose |
|---|---|
| `users` | Registered users with roles (`guest` / `admin`) |
| `rooms` | Available guest housing rooms |
| `bookings` | Room bookings |

---

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `psql not recognized` | PostgreSQL not on PATH | Add PostgreSQL `bin/` to system PATH |
| `alembic not recognized` | Not on PATH | Use `python -m alembic` |
| `uvicorn not recognized` | Not on PATH | Use `python -m uvicorn` |
| `btree_gist error` | Extension missing | `CREATE EXTENSION IF NOT EXISTS btree_gist;` |
| `500 on login` | Wrong password hash library | Use `argon2-cffi`, not `bcrypt`/`passlib` |
| `422 on register` | Missing field | Include `full_name` in the request body |
