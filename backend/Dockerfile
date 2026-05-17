# --- Stage 1: base (shared dependencies) ---
FROM python:3.11-slim AS base

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Stage 2: development (hot-reload) ---
FROM base AS development

ENV DEBUG=true \
    ENVIRONMENT=development

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# --- Stage 3: production ---
FROM base AS production

ENV DEBUG=false \
    ENVIRONMENT=production

COPY . .

RUN addgroup --system app && adduser --system --group app
USER app

EXPOSE 8000

CMD sh -c "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 4"
