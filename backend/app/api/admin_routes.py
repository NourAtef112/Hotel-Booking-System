"""
admin_routes.py — Admin-only endpoints.
Defines route paths only. No business logic.
Requires admin role authorization (TODO).
"""

from fastapi import APIRouter
from app.schemas.booking_schemas import BookingListResponse
from app.schemas.room_schemas import RoomResponse

router = APIRouter()


@router.get("/bookings", response_model=BookingListResponse)
async def admin_list_bookings():
    """
    GET /admin/bookings
    Return all bookings across all users.
    TODO: enforce admin-only access via role-based auth dependency
    TODO: delegate to booking_service.get_all_bookings()
    """
    pass


@router.patch("/bookings/{booking_id}/status")
async def admin_update_booking_status(booking_id: int):
    """
    PATCH /admin/bookings/{booking_id}/status
    Approve or reject a pending booking.
    TODO: validate status transition rules
    """
    pass


@router.get("/rooms")
async def admin_list_rooms():
    """
    GET /admin/rooms
    Return all rooms including inactive/hidden ones.
    TODO: delegate to room_service with admin flag
    """
    pass


@router.post("/rooms", response_model=RoomResponse, status_code=201)
async def admin_create_room():
    """
    POST /admin/rooms
    Create a new room listing.
    TODO: delegate to room_service.create_room()
    """
    pass


@router.put("/rooms/{room_id}")
async def admin_update_room(room_id: int):
    """
    PUT /admin/rooms/{room_id}
    Update room details.
    TODO: delegate to room_service.update_room()
    """
    pass
