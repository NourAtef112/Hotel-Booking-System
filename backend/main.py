"""
main.py — FastAPI application entry point.
Registers all routers and middleware.
No business logic here.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth_routes, room_routes, booking_routes, admin_routes

app = FastAPI(
    title="University Guest Housing Booking System",
    description="API for managing university guest housing bookings",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Router Registration ---
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(room_routes.router, prefix="/api/rooms", tags=["Rooms"])
app.include_router(booking_routes.router, prefix="/api/bookings", tags=["Bookings"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin"])


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    # TODO: Add database connectivity check
    return {"status": "ok", "version": "0.1.0"}
