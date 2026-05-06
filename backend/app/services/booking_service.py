"""
booking_service.py — Business logic layer for bookings.
All functions are stubs. No implementation yet.
"""

from datetime import date
from app.schemas.booking_schemas import BookingRequest


async def create_booking(user_id: int, payload: BookingRequest) -> dict:
    """
    Create a new booking for a user.
    TODO: Verify room exists via room_repository
    TODO: Check room availability for requested dates (no overlapping bookings)
    TODO: Calculate total price (nights × price_per_night)
    TODO: Persist booking via booking_repository.create()
    TODO: Send confirmation notification
    """
    pass


async def get_user_bookings(user_id: int) -> list:
    """
    Retrieve all bookings for a specific user.
    TODO: Query booking_repository.find_by_user_id()
    """
    pass


async def get_booking_by_id(booking_id: int, user_id: int) -> dict:
    """
    Retrieve a single booking, with ownership check.
    TODO: Query booking_repository.find_by_id()
    TODO: Raise 403 if booking does not belong to user_id
    """
    pass


async def cancel_booking(booking_id: int, user_id: int) -> None:
    """
    Cancel a booking if within cancellation policy window.
    TODO: Verify booking belongs to user
    TODO: Check cancellation window (e.g., >24h before check-in)
    TODO: Update status to CANCELLED via booking_repository
    TODO: Trigger refund if payment was made
    """
    pass


async def get_all_bookings(page: int = 1, page_size: int = 20) -> list:
    """
    Admin: Retrieve all bookings across all users.
    TODO: Query booking_repository.find_all() with pagination
    """
    pass


async def update_booking_status(booking_id: int, new_status: str) -> dict:
    """
    Admin: Approve or reject a pending booking.
    TODO: Validate allowed status transitions
    TODO: Notify user of status change
    """
    pass
