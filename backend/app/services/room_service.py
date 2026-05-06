"""
room_service.py — Business logic layer for rooms.
All functions are stubs. No implementation yet.
"""

from typing import Optional


async def get_rooms(
    available: Optional[bool] = None,
    room_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
) -> dict:
    """
    Retrieve a paginated, filtered list of rooms.
    TODO: Build filter query and delegate to room_repository.find_all()
    """
    pass


async def get_room_by_id(room_id: int) -> dict:
    """
    Retrieve a single room by ID.
    TODO: Query room_repository.find_by_id()
    TODO: Raise 404 if room not found
    """
    pass


async def create_room(payload: dict) -> dict:
    """
    Admin: Create a new room listing.
    TODO: Validate payload fields
    TODO: Persist via room_repository.create()
    """
    pass


async def update_room(room_id: int, payload: dict) -> dict:
    """
    Admin: Update room details.
    TODO: Validate room exists
    TODO: Apply partial update via room_repository.update()
    """
    pass


async def check_room_availability(room_id: int, check_in: str, check_out: str) -> bool:
    """
    Check if a room is available for a date range.
    TODO: Query booking_repository for overlapping confirmed bookings
    """
    pass
