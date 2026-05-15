"""
booking_service.py — el qalb beta3 el system.
Kol el business logic hena: el overlap check, el cost calc, w el state machine.
Mesh lazy import men el DB — da pure Python, testable bel 3ein el mogarrada.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from app.core.exceptions import (
    BookingOverlapError,
    IllegalStateTransitionError,
    RoomNotFoundError,
)

if TYPE_CHECKING:
    from app.repositories.booking_repository import IBookingRepository, BookingData


# ── State machine: el transitions el masmo7a ──────────────────────────────────
# pending → confirmed ✓   pending → rejected ✓   any → cancelled ✓
# cancelled → anything ✗  rejected → confirmed ✗
_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending":   {"confirmed", "rejected", "cancelled"},
    "confirmed": {"cancelled"},
    "rejected":  {"cancelled"},
    "cancelled": set(),   # terminal — maffish 7aga ba3d el cancel
}


# ── Pure utility functions (module-level — importable directly) ────────────────

def ranges_overlap(
    a_start: date, a_end: date,
    b_start: date, b_end: date,
) -> bool:
    # da el algorithm — strict < bass, mesh <=
    # back-to-back = allowed: checkout ams w checkin today — maffish overlap
    # a_end == b_start → a_start < b_start w b_start < a_end → False ✓
    return a_start < b_end and b_start < a_end


def calculate_cost(price_per_night: float, start_date: date, end_date: date) -> float:
    # el cost = 3adad el layali × price_per_night — bas keda, maffish taxes
    nights = (end_date - start_date).days
    return round(nights * price_per_night, 2)


# ── BookingService class ───────────────────────────────────────────────────────

class BookingService:
    """
    El service da ma by-import-sh men fastapi khales.
    By-depend 3al IBookingRepository protocol bass — sahl te3mel inject el real DB leh.
    """

    def __init__(self, repo: "IBookingRepository") -> None:
        # el repo byitgib men barra — lazy DI, mesh hardcoded
        self._repo = repo

    async def create_booking(
        self,
        user_id: int,
        room_id: int,
        start_date: date,
        end_date: date,
    ) -> "BookingData":
        # Step 1: get el oda — law mawgoudash, bye raise RoomNotFoundError
        room = self._repo.get_room_by_id(room_id)
        if room is None:
            raise RoomNotFoundError(room_id)

        # Step 2: get kol el 7agzat el existing le el oda di
        existing = self._repo.get_bookings_for_room(room_id)

        # Step 3: loop — law feeh ay overlap → bye raise BookingOverlapError
        # da el qalb beta3 el system — law overlap, msh ha-confirm 7aga
        for booking in existing:
            if booking.status in ("pending", "confirmed") and ranges_overlap(
                booking.start_date, booking.end_date, start_date, end_date
            ):
                label = getattr(room, "room_number", room_id)
                raise BookingOverlapError(
                    f"El oda {label} makhtooba men "
                    f"{booking.start_date} le {booking.end_date}"
                )

        # Step 4: el cost = price × 3adad el layali, bas
        cost = calculate_cost(room.price_per_night, start_date, end_date)

        # Step 5: save el 7agz fe el repo
        new_booking = self._repo.create_booking({
            "room_id": room_id,
            "user_id": user_id,
            "start_date": start_date,
            "end_date": end_date,
            "status": "pending",
            "total_cost": cost,
            "created_at": datetime.now(),
        })

        # Step 6: broadcast — el oda ba2et mish available ba3d el 7agz
        await self._broadcast(room_id, is_available=False)

        return new_booking

    async def update_booking_status(
        self,
        booking_id: int,
        new_status: str,
        _admin_user=None,
    ) -> "BookingData":
        # get el 7agz el haya 3ayez te3del 3aleha
        booking = self._repo.get_booking_by_id(booking_id)
        if booking is None:
            raise RoomNotFoundError(booking_id)

        current = booking.status
        allowed = _ALLOWED_TRANSITIONS.get(current, set())

        # mesh momken state ta3mel transition men cancelled le confirmed — el decision final
        if new_status not in allowed:
            raise IllegalStateTransitionError(current, new_status)

        updated = self._repo.update_booking_status(booking_id, new_status)

        # law et-cancel → el oda ra3et ta7at el 7agz — broadcast availability
        if new_status == "cancelled":
            await self._broadcast(booking.room_id, is_available=True)

        return updated

    def get_user_bookings(self, user_id: int) -> list["BookingData"]:
        # simple — get kol el 7agzat beta3 el user da
        return self._repo.get_bookings_for_user(user_id)

    @staticmethod
    async def _broadcast(room_id: int, is_available: bool) -> None:
        # law maffish event loop (zai el tests), msh ha-crash — silent fail
        try:
            from app.api.v1.ws_availability import ws_manager
            await ws_manager.broadcast_room_update(room_id, is_available)
        except Exception:
            pass


# ── Module-level singleton wired to mock repo ──────────────────────────────────

def _make_default_service() -> BookingService:
    from app.repositories.booking_repository import mock_booking_repo
    return BookingService(mock_booking_repo)


booking_service = _make_default_service()
