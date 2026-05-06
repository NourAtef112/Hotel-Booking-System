"""
main.py — FastAPI application entry point.
Registers all routers and middleware.
No business logic here.
"""

from fastapi import FastAPI
from app.api import auth_routes, room_routes, booking_routes, admin_routes

# TODO: Add CORS middleware configuration
# TODO: Add authentication middleware
# TODO: Add request logging middleware

app = FastAPI(
    title="University Guest Housing Booking System",
    description="API for managing university guest housing bookings",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# --- Router Registration ---
app.include_router(auth_routes.router, prefix="/auth", tags=["Authentication"])
app.include_router(room_routes.router, prefix="/rooms", tags=["Rooms"])
app.include_router(booking_routes.router, prefix="/bookings", tags=["Bookings"])
app.include_router(admin_routes.router, prefix="/admin", tags=["Admin"])


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    # TODO: Add database connectivity check
    return {"status": "ok", "version": "0.1.0"}
