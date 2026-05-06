"""
booking_repository.py — Data access layer for Booking entities.
All functions are stubs. No DB logic implemented.
"""

from datetime import date


async def create(booking_data: dict) -> dict:
    """
    Insert a new booking record.
    TODO: INSERT INTO bookings (...) VALUES (...)
    """
    pass


async def find_by_id(booking_id: int) -> dict | None:
    """
    Find a single booking by ID.
    TODO: SELECT * FROM bookings WHERE id = :booking_id
    """
    pass


async def find_by_user_id(user_id: int) -> list:
    """
    Find all bookings for a given user.
    TODO: SELECT * FROM bookings WHERE user_id = :user_id ORDER BY created_at DESC
    """
    pass


async def find_all(page: int = 1, page_size: int = 20) -> list:
    """
    Retrieve all bookings with pagination (admin use).
    TODO: SELECT * FROM bookings LIMIT :limit OFFSET :offset
    """
    pass


async def find_overlapping(room_id: int, check_in: date, check_out: date) -> list:
    """
    Find bookings that overlap with the requested date range.
    TODO: Complex date-overlap SQL query
    Used for availability checking before confirming a new booking.
    """
    pass


async def update_status(booking_id: int, status: str) -> dict:
    """
    Update the status of a booking.
    TODO: UPDATE bookings SET status = :status WHERE id = :booking_id
    """
    pass
