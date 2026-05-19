import os

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.api.v1.payment_router import router as payment_router
from app.api.v1.ws_availability import router as ws_router
from app.api.admin_routes import router as admin_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, create_all_tables
from app.mocks.seed_rooms import run_seed
from app.core.errors import generic_exception_handler, validation_exception_handler

app = FastAPI(
    title="University Guest Housing API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router)
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(payment_router)


@app.on_event("startup")
async def on_startup() -> None:
    await create_all_tables()
    async with AsyncSessionLocal() as session:
        await run_seed(session)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}


# mount static directory — only if it exists (allows running without the dir)
_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(_static_dir):
    app.mount("/static", StaticFiles(directory=_static_dir), name="static")
