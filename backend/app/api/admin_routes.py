"""
admin_routes.py — Admin-only endpoints backed by PostgreSQL via AdminRepository.

Routes (all prefixed with /admin by main.py):
  GET  /admin/bookings               → list all bookings (paginated)
  POST /admin/rooms                  → create a new room
  POST /admin/bookings/manual        → admin creates a booking on behalf of a guest

Security:
  Every endpoint requires a valid JWT AND role == "admin".
  Uses the existing get_current_user dependency from deps.py.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.repositories.admin_repo import AdminRepository
from app.schemas.admin import (
    BookingResponse,
    ManualBookingCreate,
    RoomCreate,
    RoomResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Shared admin-role guard
# ---------------------------------------------------------------------------

def _require_admin(current_user: User) -> None:
    """
    Raise 403 if the authenticated user is not an admin.
    User.role is an Enum column with value 'admin' for administrators.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admins only",
        )


# ---------------------------------------------------------------------------
# ENDPOINT 1 — GET /admin/bookings
# ---------------------------------------------------------------------------

@router.get(
    "/bookings",
    response_model=list[BookingResponse],
    summary="List all bookings",
    description="Admin only. Returns a paginated list of every booking in the system.",
)
async def get_all_bookings(
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BookingResponse]:
    """
    GET /admin/bookings
    Return all bookings across all users (admin view).
    """
    _require_admin(current_user)

    repo = AdminRepository(session)
    bookings = await repo.get_all_bookings(skip=skip, limit=limit)

    # Map ORM Booking fields to BookingResponse schema fields.
    # Booking model uses: check_in_date / check_out_date / no guest_name
    # BookingResponse expects: start_date / end_date / guest_name
    # We surface the related user's full_name as guest_name when available.
    results = []
    for b in bookings:
        guest_name = b.user.full_name if b.user else f"user_id:{b.user_id}"
        results.append(
            BookingResponse(
                id=b.id,
                guest_name=guest_name,
                room_id=b.room_id,
                start_date=str(b.check_in_date),
                end_date=str(b.check_out_date),
                status=b.status,
            )
        )
    return results


# ---------------------------------------------------------------------------
# ENDPOINT 2 — POST /admin/rooms
# ---------------------------------------------------------------------------

@router.post(
    "/rooms",
    response_model=RoomResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new room",
    description="Admin only. Creates a room record in PostgreSQL.",
)
async def create_room(
    room: RoomCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RoomResponse:
    """
    POST /admin/rooms
    Create a new guest housing room.

    RoomCreate.type maps to Room.room_type (Enum: single/double/suite/family).
    Room.capacity defaults to 1 when not provided via this admin endpoint.
    """
    _require_admin(current_user)

    repo = AdminRepository(session)

    # Map admin schema fields → ORM model fields:
    #   RoomCreate.type          → Room.room_type
    #   RoomCreate.price_per_night → Room.price_per_night
    # Room.capacity is required (NOT NULL) — default to 1 for admin-created rooms.
    room_data = {
        "room_number": room.room_number,
        "room_type": room.type,          # schema 'type' → model 'room_type'
        "price_per_night": room.price_per_night,
        "capacity": 1,                   # safe default; can be updated later
    }

    new_room = await repo.create_room(room_data)
    await session.commit()          # commit transaction here in router
    await session.refresh(new_room) # reload to get server-generated id / defaults

    return RoomResponse(
        id=new_room.id,
        room_number=new_room.room_number,
        type=new_room.room_type,         # model 'room_type' → schema 'type'
        price_per_night=float(new_room.price_per_night),
    )


# ---------------------------------------------------------------------------
# ENDPOINT 3 — POST /admin/bookings/manual
# ---------------------------------------------------------------------------

@router.post(
    "/bookings/manual",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Manually create a booking",
    description="Admin only. Creates a booking on behalf of a guest without requiring guest auth.",
)
async def create_manual_booking(
    booking: ManualBookingCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingResponse:
    """
    POST /admin/bookings/manual
    Admin creates a booking on behalf of a named guest.

    ManualBookingCreate fields   → Booking model fields:
      guest_name (display only)  → stored as special_requests note
      room_id                    → room_id
      start_date (YYYY-MM-DD)    → check_in_date
      end_date   (YYYY-MM-DD)    → check_out_date
      total_price                → 0.0 (admin override; recalculate separately)
      user_id                    → admin's own id (acting as proxy)
    """
    _require_admin(current_user)

    from datetime import date as _date

    repo = AdminRepository(session)

    # Parse date strings into Python date objects for the DB column (Date type).
    try:
        check_in = _date.fromisoformat(booking.start_date)
        check_out = _date.fromisoformat(booking.end_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Dates must be in YYYY-MM-DD format",
        )

    if check_out <= check_in:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_date must be after start_date",
        )

    booking_data = {
        "user_id": current_user.id,          # admin acts as booking owner
        "room_id": booking.room_id,
        "check_in_date": check_in,
        "check_out_date": check_out,
        "total_price": 0.0,                  # admin override; recalculate if needed
        "status": "confirmed",               # manual bookings are auto-confirmed
        "special_requests": f"Manual booking for guest: {booking.guest_name}",
    }

    new_booking = await repo.create_manual_booking(booking_data)
    await session.commit()             # commit transaction here in router
    await session.refresh(new_booking) # reload generated id / defaults

    return BookingResponse(
        id=new_booking.id,
        guest_name=booking.guest_name,                 # echo back what admin sent
        room_id=new_booking.room_id,
        start_date=str(new_booking.check_in_date),
        end_date=str(new_booking.check_out_date),
        status=new_booking.status,
    )
