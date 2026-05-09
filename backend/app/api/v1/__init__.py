from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.rooms import router as rooms_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.admin import router as admin_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(rooms_router)
api_router.include_router(bookings_router)
api_router.include_router(admin_router)
