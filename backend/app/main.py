from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.api.v1.ws_availability import router as ws_router
from app.api.admin_routes import router as admin_router
from app.core.errors import generic_exception_handler, validation_exception_handler

app = FastAPI(
    title="University Guest Housing API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router)
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
