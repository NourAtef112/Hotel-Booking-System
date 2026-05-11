"""
room_repository.py — Data access layer for Room entities.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.room import Room


async def find_all(
    session: AsyncSession,
    status: Optional[str] = None,
    room_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
) -> dict:
    """
    Retrieve a paginated list of rooms with optional filters.
    """
    query = select(Room)
    
    if status is not None:
        query = query.where(Room.status == status)
    if room_type is not None:
        query = query.where(Room.room_type == room_type)

    # Get total count for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar_one()

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await session.execute(query)
    rooms = result.scalars().all()

    return {"rooms": rooms, "total": total}


async def find_by_id(session: AsyncSession, room_id: int) -> Optional[Room]:
    """
    Find a single room by ID.
    """
    result = await session.execute(select(Room).where(Room.id == room_id))
    return result.scalar_one_or_none()

async def create(session: AsyncSession, room_data: dict) -> Room:
    """Create a new room."""
    room = Room(**room_data)
    session.add(room)
    await session.flush()
    await session.refresh(room)
    return room

async def update_room(session: AsyncSession, room_id: int, room_data: dict) -> Optional[Room]:
    """Update room details."""
    stmt = update(Room).where(Room.id == room_id).values(**room_data).returning(Room)
    result = await session.execute(stmt)
    await session.flush()
    return result.scalar_one_or_none()


async def create(room_data: dict) -> dict:
    """
    Insert a new room record.
    TODO: INSERT INTO rooms (...) VALUES (...)
    """
    pass


async def update(room_id: int, update_data: dict) -> dict:
    """
    Update room fields.
    TODO: UPDATE rooms SET ... WHERE id = :room_id
    """
    pass
