"""
booking_repository.py — Data access layer for Booking entities.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, Protocol, runtime_checkable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Booking


# ── Async repository functions (real DB) ──────────────────────────────────────

async def create(session: AsyncSession, data: dict) -> Booking:
    booking = Booking(**data)
    session.add(booking)
    await session.flush()
    await session.refresh(booking)
    return booking


async def find_by_id(session: AsyncSession, booking_id: int) -> Optional[Booking]:
    result = await session.execute(select(Booking).where(Booking.id == booking_id))
    return result.scalar_one_or_none()


async def find_by_user_id(session: AsyncSession, user_id: int) -> list:
    result = await session.execute(select(Booking).where(Booking.user_id == user_id))
    return result.scalars().all()


async def find_all(session: AsyncSession, page: int = 1, page_size: int = 20) -> list:
    result = await session.execute(
        select(Booking).offset((page - 1) * page_size).limit(page_size)
    )
    return result.scalars().all()


async def find_overlapping(
    session: AsyncSession,
    room_id: int,
    check_in: date,
    check_out: date,
) -> list:
    result = await session.execute(
        select(Booking).where(
            Booking.room_id == room_id,
            Booking.status.in_(["pending", "confirmed"]),
            Booking.check_in < check_out,
            Booking.check_out > check_in,
        )
    )
    return result.scalars().all()


async def update_status(
    session: AsyncSession, booking_id: int, new_status: str
) -> Optional[Booking]:
    result = await session.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if booking is None:
        return None
    booking.status = new_status
    await session.flush()
    return booking


# ── Domain dataclasses (used by mock layer until PostgreSQL is wired) ──────────

@dataclass
class RoomData:
    id: int
    room_number: str
    type: str
    capacity: int
    price_per_night: float
    amenities: list
    building: str
    available: bool
    image_url: str


@dataclass
class BookingData:
    id: int
    room_id: int
    user_id: int
    start_date: date
    end_date: date
    status: str
    total_cost: float
    created_at: datetime = field(default_factory=datetime.now)
    special_requests: Optional[str] = None
    phone_number:     Optional[str] = None
    university_id:    Optional[str] = None
    national_id:      Optional[str] = None


# ── Abstract interface (Protocol — no inheritance required) ────────────────────

@runtime_checkable
class IBookingRepository(Protocol):
    def get_room_by_id(self, room_id: int) -> Optional[RoomData]: ...
    def get_bookings_for_room(self, room_id: int) -> list[BookingData]: ...
    def create_booking(self, data: dict) -> BookingData: ...
    def get_booking_by_id(self, booking_id: int) -> Optional[BookingData]: ...
    def update_booking_status(self, booking_id: int, status: str) -> Optional[BookingData]: ...
    def get_bookings_for_user(self, user_id: int) -> list[BookingData]: ...
    def update_payment_status(self, booking_id: int, status: str) -> None: ...


# ── In-memory mock (used until PostgreSQL session is injected) ─────────────────

class MockBookingRepository:
    """
    Da el mock repository — beshtaghal fe el memory le7ad ma el DB yetsa7a7.
    Pre-populated with seed E-JUST room data + 3 sample bookings for GH-101 (room_id=1).
    """

    def __init__(self) -> None:
        from app.mocks.seed_rooms import ROOMS, EXISTING_BOOKINGS

        self._rooms: dict[int, RoomData] = {
            r["id"]: RoomData(**r) for r in ROOMS
        }
        self._bookings: list[BookingData] = [
            BookingData(
                id=b["id"],
                room_id=b["room_id"],
                user_id=b["user_id"],
                start_date=date.fromisoformat(b["start_date"]),
                end_date=date.fromisoformat(b["end_date"]),
                status=b["status"],
                total_cost=b["total_cost"],
            )
            for b in EXISTING_BOOKINGS
        ]
        # 3 extra sample bookings for GH-101 (room_id=1) to show realistic state
        self._bookings += [
            BookingData(id=10, room_id=1, user_id=2,
                        start_date=date(2026, 6, 1), end_date=date(2026, 6, 5),
                        status="confirmed", total_cost=1000.0),
            BookingData(id=11, room_id=1, user_id=3,
                        start_date=date(2026, 6, 10), end_date=date(2026, 6, 15),
                        status="pending", total_cost=1250.0),
            BookingData(id=12, room_id=1, user_id=4,
                        start_date=date(2026, 6, 20), end_date=date(2026, 6, 25),
                        status="confirmed", total_cost=1250.0),
        ]
        self._next_id = 100

    def get_room_by_id(self, room_id: int) -> Optional[RoomData]:
        return self._rooms.get(room_id)

    def get_bookings_for_room(self, room_id: int) -> list[BookingData]:
        return [b for b in self._bookings if b.room_id == room_id]

    def create_booking(self, data: dict) -> BookingData:
        booking = BookingData(id=self._next_id, **data)
        self._next_id += 1
        self._bookings.append(booking)
        return booking

    def get_booking_by_id(self, booking_id: int) -> Optional[BookingData]:
        return next((b for b in self._bookings if b.id == booking_id), None)

    def update_booking_status(self, booking_id: int, status: str) -> Optional[BookingData]:
        booking = self.get_booking_by_id(booking_id)
        if booking:
            booking.status = status
        return booking

    def get_bookings_for_user(self, user_id: int) -> list[BookingData]:
        return [b for b in self._bookings if b.user_id == user_id]

    def update_payment_status(self, booking_id: int, status: str) -> None:
        for b in self._bookings:
            if b.id == booking_id:
                b.status = status
                return


# module-level singleton — imported by the router until DI is wired
mock_booking_repo = MockBookingRepository()
