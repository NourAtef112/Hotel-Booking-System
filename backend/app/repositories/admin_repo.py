"""
admin_repo.py — Data access layer for Admin operations.

Handles direct PostgreSQL queries for:
  - Listing all bookings (with pagination)
  - Creating rooms
  - Creating manual (admin-initiated) bookings

Architecture rules:
  - ONLY database queries live here — no HTTP, no business logic.
  - Session is always injected from outside (FastAPI dependency injection).
  - Uses AsyncSession + SQLAlchemy Core select() to match the project pattern.
  - Transaction commit is the caller's responsibility (service / route layer).
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.room import Room


# ---------------------------------------------------------------------------
# AdminRepository — class-based wrapper around async DB operations
# ---------------------------------------------------------------------------


class AdminRepository:
    """
    Encapsulates all admin-facing database operations.

    Usage (inside a FastAPI route):
        async def my_route(db: AsyncSession = Depends(get_db)):
            repo = AdminRepository(db)
            bookings = await repo.get_all_bookings()
    """

    def __init__(self, db: AsyncSession) -> None:
        """Store the injected async session for use in all query methods."""
        self.db = db

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    async def get_all_rooms(self, skip: int = 0, limit: int = 200) -> List[Room]:
        stmt = select(Room).where(Room.is_active == True).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_all_bookings(
        self, skip: int = 0, limit: int = 100
    ) -> List[Booking]:
        """
        Return a paginated list of all bookings in the system.

        Args:
            skip:  Number of records to skip (offset for pagination).
            limit: Maximum number of records to return (capped at 100).

        Returns:
            List of Booking ORM objects.
        """
        stmt = (
            select(Booking)
            .options(selectinload(Booking.user))  # eagerly load user to avoid lazy-load error
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ------------------------------------------------------------------
    # CREATE — Room
    # ------------------------------------------------------------------

    async def create_room(self, room_data: dict) -> Room:
        """
        Insert a new Room record into PostgreSQL.

        Args:
            room_data: Dict of column values matching the Room model fields.
                       Caller is responsible for mapping API field names to
                       ORM field names (e.g. 'type' → 'room_type').

        Returns:
            The freshly created Room object with its database-generated id.
        """
        new_room = Room(**room_data)
        self.db.add(new_room)
        await self.db.flush()           # writes SQL INSERT, keeps transaction open
        await self.db.refresh(new_room) # reloads generated id + server defaults
        return new_room

    # ------------------------------------------------------------------
    # CREATE — Manual Booking
    # ------------------------------------------------------------------

    async def update_booking_status(self, booking_id: int, new_status: str) -> Optional[Booking]:
        """
        Update the status of an existing booking.

        Returns the updated Booking, or None if not found.
        """
        result = await self.db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()
        if booking is None:
            return None
        booking.status = new_status
        await self.db.flush()
        await self.db.refresh(booking)
        return booking

    async def update_booking(self, booking_id: int, fields: dict) -> Optional[Booking]:
        """Update editable fields (dates, guest name) on an existing booking."""
        from datetime import date as _date
        result = await self.db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()
        if booking is None:
            return None
        if "check_in_date" in fields:
            booking.check_in_date = fields["check_in_date"]
        if "check_out_date" in fields:
            booking.check_out_date = fields["check_out_date"]
        if "special_requests" in fields:
            booking.special_requests = fields["special_requests"]
        await self.db.flush()
        await self.db.refresh(booking)
        return booking

    async def create_manual_booking(self, booking_data: dict) -> Booking:
        """
        Insert a new Booking record on behalf of an admin.

        Args:
            booking_data: Dict of column values matching the Booking model fields.
                          Caller must supply all NOT NULL columns:
                            user_id, room_id, check_in_date, check_out_date,
                            total_price, and optionally status / special_requests.

        Returns:
            The freshly created Booking object with its database-generated id.
        """
        new_booking = Booking(**booking_data)
        self.db.add(new_booking)
        await self.db.flush()              # writes SQL INSERT, keeps transaction open
        await self.db.refresh(new_booking) # reloads generated id + server defaults
        return new_booking
