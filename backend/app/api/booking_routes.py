"""
booking_routes.py — Booking creation and management endpoints.
Defines route paths only. No business logic.
"""

from fastapi import APIRouter
from app.schemas.booking_schemas import BookingRequest, BookingResponse, BookingListResponse

router = APIRouter()


@router.post("/", response_model=BookingResponse, status_code=201)
async def create_booking(payload: BookingRequest):
    """
    POST /bookings
    Create a new room booking for the authenticated user.
    TODO: delegate to booking_service.create_booking()
    TODO: check room availability before confirming
    """
    pass


@router.get("/", response_model=BookingListResponse)
async def list_my_bookings():
    """
    GET /bookings
    Return all bookings for the currently authenticated user.
    TODO: extract user_id from JWT, delegate to booking_service.get_user_bookings()
    """
    pass


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: int):
    """
    GET /bookings/{booking_id}
    Return details for a specific booking.
    TODO: validate ownership before returning
    """
    pass


@router.delete("/{booking_id}", status_code=204)
async def cancel_booking(booking_id: int):
    """
    DELETE /bookings/{booking_id}
    Cancel a booking (only if within allowed cancellation window).
    TODO: delegate to booking_service.cancel_booking()
    """
    pass
