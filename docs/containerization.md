# Containerization — Issue #3

Implemented by Nour Atef | Branch: feature/devOps-Infra

## Why We Did This

Before containerization, each team member (Nour, Moamen, Yassin) needed to manually
install Python 3.11, PostgreSQL, create the right database, configure the right user,
and match the exact DATABASE_URL. One wrong version or missed step and the app breaks
locally — but only on that person's machine. This is the classic "works on my machine"
problem.

Docker solves this by packaging the app and its dependencies into isolated containers
that behave identically everywhere — on any developer's laptop, CI pipeline, or server.
`docker compose up` becomes the entire setup process.

## Why Multi-Stage Dockerfile

We use a multi-stage Dockerfile instead of a single-stage one for two reasons:

1. **Development stage** (`target: development`): Runs with `--reload`, so uvicorn
   automatically restarts when you edit Python files. The source code directory is
   mounted as a volume, so changes appear instantly without rebuilding the image.

2. **Production stage** (`target: production`): Runs with 4 workers for concurrency,
   drops root privileges (runs as a non-root `app` user for security), and bakes the
   code into the image rather than mounting it. This stage is what you'd deploy.

Both stages share the same base layer (dependency installation), so you don't install
packages twice.

## Why a Health Check on the DB Service

FastAPI connects to PostgreSQL the moment it starts. If the backend container starts
before PostgreSQL is ready to accept connections, the app crashes immediately and Docker
marks it as failed.

The `healthcheck` on the `db` service runs `pg_isready` every 5 seconds. The `backend`
service has `depends_on: db: condition: service_healthy`, which tells Docker Compose to
hold the backend until the DB passes its health check. This eliminates the startup race
condition entirely.

## Why an Isolated `app-network`

By default, Docker containers can see all other containers on the host. We define an
explicit `app-network` bridge so `backend` and `db` communicate privately by service
name (`db:5432`) without exposing the database to other containers. This is the minimal
network isolation step before adding Nginx or additional services later.

## Why a Makefile

`docker compose exec backend alembic upgrade head` is a mouthful. The Makefile wraps
all common operations into short commands (`make migrate`, `make seed`, `make test`).
It also serves as living documentation — new team members can read the Makefile to
understand what operations exist without reading Docker docs.

---

## Architecture

Two Docker services running on an isolated `app-network` bridge:

| Service | Image | Port mapping |
|---------|-------|-------------|
| `db` | postgres:15-alpine | 5555 (host) → 5432 (container) |
| `backend` | python:3.11-slim (multi-stage) | 8000 → 8000 |

The backend waits for the DB health check before starting (no startup race condition).

## Files Added / Modified

| File | Action | Description |
|------|--------|-------------|
| `backend/Dockerfile` | Created | Multi-stage: `development` (hot-reload) + `production` (4 workers) |
| `backend/.dockerignore` | Created | Excludes `__pycache__`, `.env`, test artifacts from image |
| `docker-compose.yml` | Modified | Added `backend` service, health check on `db`, `app-network` |
| `.env.example` | Modified | Documents Docker vs local `DATABASE_URL` difference |
| `Makefile` | Created | Developer shortcuts at repo root |

---

## How to Run (Local Development)

**Prerequisites:** Docker Desktop installed and running.

```bash
# 1. Build images and start services
make up

# 2. Run database migrations (first time only, or after schema changes)
make migrate

# 3. Seed initial data (first time only)
make seed

# 4. Check the API is alive
make health
# → {"status": "ok", "version": "0.1.0"}
```

Swagger UI: http://localhost:8000/api/docs

## Common Commands

| Command | What it does |
|---------|-------------|
| `make up` | Start all services in background |
| `make down` | Stop and remove containers |
| `make build` | Rebuild images from scratch (use after changing requirements.txt) |
| `make logs` | Tail logs from all services |
| `make migrate` | Run Alembic migrations inside the backend container |
| `make seed` | Seed database with initial data |
| `make test` | Run pytest inside backend container |
| `make shell` | Open bash shell in backend container |

## Environment Variables

Copy `.env.example` to `.env` for local development context.

Key difference between environments:

| Context | `DATABASE_URL` |
|---------|---------------|
| Local Python (no Docker) | `postgresql+asyncpg://postgres:password@localhost:5432/guest_housing` |
| Docker Compose | `postgresql+asyncpg://postgres:postgres@db:5432/university_housing` |

The `docker-compose.yml` sets `DATABASE_URL` directly in the backend container
environment, so no `.env` file is needed when using Docker.

## Database Note

The PostgreSQL container uses database name `university_housing`. The `.env.example`
default for local dev uses `guest_housing` — this is intentional, as local developers
may have a pre-existing Postgres setup with different names. When using Docker, the
compose-defined `DATABASE_URL` takes precedence automatically.

Always run `make migrate` after first `make up` to create the schema tables.
