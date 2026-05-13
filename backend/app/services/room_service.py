"""
room_service.py — Business logic layer for rooms.
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories import room_repository


async def get_rooms(
    session: AsyncSession,
    available: Optional[bool] = None,
    room_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
) -> dict:
    """Retrieve a paginated, filtered list of rooms."""
    status_filter = "available" if available is True else None
    if available is False:
        status_filter = "occupied" # Or whatever mapping makes sense, assuming available means status=="available"
        
    return await room_repository.find_all(
        session=session,
        status=status_filter,
        room_type=room_type,
        page=page,
        page_size=page_size
    )


async def get_room_by_id(session: AsyncSession, room_id: int) -> dict:
    """Retrieve a single room by ID."""
    room = await room_repository.find_by_id(session, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    # Convert SQLAlchemy model to dict/schema format if needed, but Pydantic handles ORM models via from_attributes
    return room


async def create_room(session: AsyncSession, payload: dict) -> dict:
    """Admin: Create a new room listing."""
    room = await room_repository.create(session, payload)
    await session.commit()
    return room


async def update_room(session: AsyncSession, room_id: int, payload: dict) -> dict:
    """Admin: Update room details."""
    room = await room_repository.find_by_id(session, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    updated_room = await room_repository.update_room(session, room_id, payload)
    await session.commit()
    return updated_room


async def check_room_availability(session: AsyncSession, room_id: int, check_in: str, check_out: str) -> bool:
    """Check if a room is available for a date range."""
    # Assuming string inputs are ISO format dates (YYYY-MM-DD), they need to be converted to date objects
    from datetime import date
    check_in_date = date.fromisoformat(check_in) if isinstance(check_in, str) else check_in
    check_out_date = date.fromisoformat(check_out) if isinstance(check_out, str) else check_out
    
    from app.repositories import booking_repository
    overlaps = await booking_repository.find_overlapping(session, room_id, check_in_date, check_out_date)
    return len(overlaps) == 0
