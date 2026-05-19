"""
sql_booking_repository.py — SQLAlchemy async implementation of IBookingRepository.

MockBookingRepository stays untouched for unit tests.
This class is injected in the real FastAPI routes via the get_db dependency.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Booking, Room
from app.repositories.booking_repository import BookingData, RoomData


class SQLBookingRepository:
    """Async SQLAlchemy implementation of IBookingRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── Rooms ──────────────────────────────────────────────────────────────────

    async def get_room(self, room_id: int) -> Optional[RoomData]:
        result = await self._session.execute(select(Room).where(Room.id == room_id))
        room = result.scalar_one_or_none()
        return self._room_to_data(room) if room else None

    async def get_room_by_id(self, room_id: int) -> Optional[RoomData]:
        return await self.get_room(room_id)

    async def get_all_rooms(self) -> list[RoomData]:
        result = await self._session.execute(
            select(Room).where(Room.is_active.is_(True))
        )
        return [self._room_to_data(r) for r in result.scalars().all()]

    # ── Bookings ────────────────────────────────────────────────────────────────

    async def get_overlapping_bookings(
        self, room_id: int, check_in: date, check_out: date
    ) -> list[BookingData]:
        """Return active bookings for the room that overlap with [check_in, check_out).
        Uses SELECT FOR UPDATE to prevent concurrent double-bookings.
        """
        result = await self._session.execute(
            select(Booking)
            .where(Booking.room_id == room_id)
            .where(Booking.status.in_(["pending", "confirmed"]))
            .with_for_update()
        )
        bookings = result.scalars().all()
        return [
            self._booking_to_data(b)
            for b in bookings
            if b.check_in < check_out and check_in < b.check_out
        ]

    async def get_bookings_for_room(self, room_id: int) -> list[BookingData]:
        result = await self._session.execute(
            select(Booking)
            .where(Booking.room_id == room_id)
            .where(Booking.status.in_(["pending", "confirmed"]))
        )
        return [self._booking_to_data(b) for b in result.scalars().all()]

    async def create_booking(self, data: dict) -> BookingData:
        booking = Booking(
            user_id=data["user_id"],
            room_id=data["room_id"],
            check_in=data["start_date"],
            check_out=data["end_date"],
            status=data["status"],
            total_price=data["total_cost"],
        )
        self._session.add(booking)
        await self._session.flush()
        await self._session.refresh(booking)
        return self._booking_to_data(booking)

    async def get_booking_by_id(self, booking_id: int) -> Optional[BookingData]:
        result = await self._session.execute(
            select(Booking).where(Booking.id == booking_id)
        )
        booking = result.scalar_one_or_none()
        return self._booking_to_data(booking) if booking else None

    async def update_booking_status(
        self, booking_id: int, status: str
    ) -> Optional[BookingData]:
        result = await self._session.execute(
            select(Booking).where(Booking.id == booking_id)
        )
        booking = result.scalar_one_or_none()
        if booking:
            booking.status = status
            await self._session.flush()
        return self._booking_to_data(booking) if booking else None

    async def get_bookings_for_user(self, user_id: int) -> list[BookingData]:
        result = await self._session.execute(
            select(Booking).where(Booking.user_id == user_id)
        )
        return [self._booking_to_data(b) for b in result.scalars().all()]

    async def get_bookings_by_user(self, user_id: int) -> list[BookingData]:
        return await self.get_bookings_for_user(user_id)

    async def get_all_bookings(self) -> list[BookingData]:
        result = await self._session.execute(select(Booking))
        return [self._booking_to_data(b) for b in result.scalars().all()]

    async def update_payment_status(self, booking_id: int, status: str) -> None:
        result = await self._session.execute(
            select(Booking).where(Booking.id == booking_id)
        )
        booking = result.scalar_one_or_none()
        if booking:
            booking.status = status
            await self._session.flush()

    # ── Converters ─────────────────────────────────────────────────────────────

    @staticmethod
    def _room_to_data(room: Room) -> RoomData:
        return RoomData(
            id=room.id,
            room_number=room.room_number,
            type=room.room_type,
            capacity=1,
            price_per_night=float(room.price_per_night),
            amenities=[],
            building="",
            available=room.status == "available",
            image_url="",
        )

    @staticmethod
    def _booking_to_data(booking: Booking) -> BookingData:
        return BookingData(
            id=booking.id,
            room_id=booking.room_id,
            user_id=booking.user_id,
            start_date=booking.check_in,
            end_date=booking.check_out,
            status=booking.status,
            total_cost=float(booking.total_price),
            created_at=booking.created_at if booking.created_at else datetime.now(),
        )
