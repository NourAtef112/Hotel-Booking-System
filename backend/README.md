# University Guest Housing — Backend

FastAPI backend for the University Guest Housing Booking System.

## Quick start

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Swagger UI: http://localhost:8000/docs  
Health check: http://localhost:8000/health

## Structure

```
app/
├── main.py          # FastAPI app factory
├── core/            # Config, error handlers
├── schemas/         # Pydantic request/response models (source of truth)
├── api/v1/          # FastAPI routers (mock data only — Issue #5)
└── mocks/           # Static mock data for mobile team integration
```

## Notes

- All endpoints return **mock data** — business logic and DB integration come in Issue #6.
- Auth endpoints return a placeholder JWT; no verification is enforced yet.
- CORS is open (`*`) for mobile development convenience.
