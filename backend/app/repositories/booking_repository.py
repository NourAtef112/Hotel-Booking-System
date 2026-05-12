"""
booking_repository.py — Data access layer for Booking entities.
"""

from datetime import date
from typing import Optional, List
from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.booking import Booking


async def create(session: AsyncSession, booking_data: dict) -> Booking:
    """Insert a new booking record."""
    booking = Booking(**booking_data)
    session.add(booking)
    await session.flush()
    await session.refresh(booking)
    return booking


async def find_by_id(session: AsyncSession, booking_id: int) -> Optional[Booking]:
    """Find a single booking by ID."""
    result = await session.execute(select(Booking).where(Booking.id == booking_id))
    return result.scalar_one_or_none()


async def find_by_user_id(session: AsyncSession, user_id: int) -> List[Booking]:
    """Find all bookings for a given user."""
    result = await session.execute(
        select(Booking).where(Booking.user_id == user_id).order_by(Booking.created_at.desc())
    )
    return result.scalars().all()


async def find_all(session: AsyncSession, page: int = 1, page_size: int = 20) -> List[Booking]:
    """Retrieve all bookings with pagination (admin use)."""
    result = await session.execute(
        select(Booking).offset((page - 1) * page_size).limit(page_size).order_by(Booking.created_at.desc())
    )
    return result.scalars().all()


async def find_overlapping(
    session: AsyncSession, room_id: int, check_in: date, check_out: date
) -> List[Booking]:
    """Find active bookings that overlap with a date range for a specific room."""
    result = await session.execute(
        select(Booking).where(
            and_(
                Booking.room_id == room_id,
                Booking.status.in_(["pending", "confirmed"]),
                Booking.check_in_date < check_out,
                Booking.check_out_date > check_in,
            )
        )
    )
    return result.scalars().all()


async def update_status(session: AsyncSession, booking_id: int, new_status: str) -> Optional[Booking]:
    """Update booking status."""
    stmt = update(Booking).where(Booking.id == booking_id).values(status=new_status).returning(Booking)
    result = await session.execute(stmt)
    await session.flush()
    return result.scalar_one_or_none()


async def cancel(session: AsyncSession, booking_id: int) -> Optional[Booking]:
    """Cancel a booking by setting its status to 'cancelled'."""
    return await update_status(session, booking_id, "cancelled")
