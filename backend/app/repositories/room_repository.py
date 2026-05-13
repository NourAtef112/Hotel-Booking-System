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
    """Retrieve a paginated list of rooms with optional filters."""
    query = select(Room)

    if status is not None:
        query = query.where(Room.status == status)
    if room_type is not None:
        query = query.where(Room.room_type == room_type)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar_one()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await session.execute(query)
    rooms = result.scalars().all()

    return {"rooms": rooms, "total": total}


async def find_by_id(session: AsyncSession, room_id: int) -> Optional[Room]:
    """Find a single room by ID."""
    result = await session.execute(select(Room).where(Room.id == room_id))
    return result.scalar_one_or_none()


async def find_by_id_for_update(session: AsyncSession, room_id: int) -> Optional[Room]:
    """Find a single room by ID and lock it for update to prevent race conditions."""
    result = await session.execute(select(Room).where(Room.id == room_id).with_for_update())
    return result.scalar_one_or_none()


async def create(session: AsyncSession, room_data: dict) -> Room:
    """Insert a new room record."""
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


async def delete_room(session: AsyncSession, room_id: int) -> None:
    """Soft-delete a room by setting is_active to False."""
    stmt = update(Room).where(Room.id == room_id).values(is_active=False)
    await session.execute(stmt)
    await session.flush()


async def update_room_status(session: AsyncSession, room_id: int, new_status: str) -> Optional[Room]:
    """Update room availability status."""
    stmt = update(Room).where(Room.id == room_id).values(status=new_status).returning(Room)
    result = await session.execute(stmt)
    await session.flush()
    return result.scalar_one_or_none()
