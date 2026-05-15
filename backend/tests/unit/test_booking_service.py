import pytest
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional

from app.services.booking_service import BookingService, calculate_cost
from app.core.exceptions import BookingOverlapError, RoomNotFoundError, IllegalStateTransitionError


# ── Fake domain objects ────────────────────────────────────────────────────────

@dataclass
class FakeRoom:
    id: int
    price_per_night: float
    available: bool = True


@dataclass
class FakeBooking:
    id: int
    room_id: int
    user_id: int
    start_date: date
    end_date: date
    status: str
    total_cost: float
    created_at: datetime = field(default_factory=datetime.now)


# ── Fake repository ────────────────────────────────────────────────────────────

class FakeBookingRepository:
    def __init__(self, rooms=None, bookings=None):
        self.rooms: dict[int, FakeRoom] = rooms or {}
        self.bookings: list[FakeBooking] = bookings or []
        self._next_id = 100

    def get_room_by_id(self, room_id: int) -> Optional[FakeRoom]:
        return self.rooms.get(room_id)

    def get_bookings_for_room(self, room_id: int) -> list[FakeBooking]:
        return [b for b in self.bookings if b.room_id == room_id]

    def create_booking(self, data: dict) -> FakeBooking:
        booking = FakeBooking(id=self._next_id, **data)
        self._next_id += 1
        self.bookings.append(booking)
        return booking

    def get_booking_by_id(self, booking_id: int) -> Optional[FakeBooking]:
        return next((b for b in self.bookings if b.id == booking_id), None)

    def update_booking_status(self, booking_id: int, status: str) -> Optional[FakeBooking]:
        booking = self.get_booking_by_id(booking_id)
        if booking:
            booking.status = status
        return booking

    def get_bookings_for_user(self, user_id: int) -> list[FakeBooking]:
        return [b for b in self.bookings if b.user_id == user_id]


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_service(rooms=None, bookings=None) -> BookingService:
    repo = FakeBookingRepository(rooms=rooms, bookings=bookings)
    return BookingService(repo)


# ── Test: create_booking ───────────────────────────────────────────────────────

async def test_create_booking_no_existing_returns_pending():
    service = make_service(rooms={1: FakeRoom(id=1, price_per_night=100.0)})
    booking = await service.create_booking(
        user_id=1, room_id=1,
        start_date=date(2026, 6, 1), end_date=date(2026, 6, 4),
    )
    assert booking.status == "pending"
    assert booking.total_cost == 300.0


async def test_create_booking_overlap_raises():
    existing = FakeBooking(
        id=1, room_id=1, user_id=2,
        start_date=date(2026, 6, 1), end_date=date(2026, 6, 5),
        status="confirmed", total_cost=400.0,
    )
    service = make_service(
        rooms={1: FakeRoom(id=1, price_per_night=100.0)},
        bookings=[existing],
    )
    with pytest.raises(BookingOverlapError):
        await service.create_booking(
            user_id=3, room_id=1,
            start_date=date(2026, 6, 3), end_date=date(2026, 6, 7),
        )


async def test_create_booking_nonexistent_room_raises():
    service = make_service(rooms={})
    with pytest.raises(RoomNotFoundError):
        await service.create_booking(
            user_id=1, room_id=99,
            start_date=date(2026, 6, 1), end_date=date(2026, 6, 4),
        )


# ── Test: calculate_cost ───────────────────────────────────────────────────────

def test_calculate_cost_3_nights():
    assert calculate_cost(50.0, date(2026, 5, 15), date(2026, 5, 18)) == 150.0


def test_calculate_cost_30_nights():
    assert calculate_cost(100.0, date(2026, 5, 15), date(2026, 6, 14)) == 3000.0


# ── Test: update_booking_status ────────────────────────────────────────────────

def _make_booking_with_status(status: str) -> tuple[FakeBookingRepository, int]:
    booking = FakeBooking(
        id=1, room_id=1, user_id=1,
        start_date=date(2026, 7, 1), end_date=date(2026, 7, 4),
        status=status, total_cost=300.0,
    )
    repo = FakeBookingRepository(
        rooms={1: FakeRoom(id=1, price_per_night=100.0)},
        bookings=[booking],
    )
    return repo, 1


async def test_pending_to_confirmed_allowed():
    repo, booking_id = _make_booking_with_status("pending")
    service = BookingService(repo)
    result = await service.update_booking_status(booking_id, "confirmed")
    assert result.status == "confirmed"


async def test_pending_to_rejected_allowed():
    repo, booking_id = _make_booking_with_status("pending")
    service = BookingService(repo)
    result = await service.update_booking_status(booking_id, "rejected")
    assert result.status == "rejected"


async def test_cancelled_to_confirmed_raises():
    repo, booking_id = _make_booking_with_status("cancelled")
    service = BookingService(repo)
    with pytest.raises(IllegalStateTransitionError):
        await service.update_booking_status(booking_id, "confirmed")


async def test_rejected_to_confirmed_raises():
    repo, booking_id = _make_booking_with_status("rejected")
    service = BookingService(repo)
    with pytest.raises(IllegalStateTransitionError):
        await service.update_booking_status(booking_id, "confirmed")
