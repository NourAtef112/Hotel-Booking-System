#!/bin/sh
set -e
echo "Running database migrations..."
alembic upgrade head
echo "Starting API on port ${PORT:-8000} with ${WEB_CONCURRENCY:-1} worker(s)..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers "${WEB_CONCURRENCY:-1}" \
    --proxy-headers \
    --forwarded-allow-ips="*"
