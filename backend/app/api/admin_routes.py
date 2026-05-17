"""
admin_routes.py — Admin dashboard endpoints (auth-free for development).

Routes (all prefixed with /api/admin by main.py):
  GET  /admin/bookings          → list all bookings (paginated)
  POST /admin/rooms             → create a new room
  POST /admin/bookings/manual   → create a booking on behalf of a guest
"""

from datetime import date as _date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.user import User
from app.repositories.admin_repo import AdminRepository
from app.schemas.admin import (
    BookingResponse,
    BookingStatusUpdate,
    BookingUpdate,
    ManualBookingCreate,
    RoomCreate,
    RoomResponse,
)

router = APIRouter()


async def _get_any_admin_id(session: AsyncSession) -> int:
    """Return the id of the first admin user in the DB (used as proxy owner)."""
    result = await session.execute(
        select(User.id).where(User.role == "admin").limit(1)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No admin user found in database. Run create_admin.py first.",
        )
    return row


# ---------------------------------------------------------------------------
# GET /admin/rooms
# ---------------------------------------------------------------------------

@router.get("/rooms", response_model=list[RoomResponse])
async def get_all_rooms(
    skip: int = 0,
    limit: int = 200,
    session: AsyncSession = Depends(get_db),
) -> list[RoomResponse]:
    repo = AdminRepository(session)
    rooms = await repo.get_all_rooms(skip=skip, limit=limit)
    return [
        RoomResponse(
            id=r.id,
            room_number=r.room_number,
            type=r.room_type,
            price_per_night=float(r.price_per_night),
        )
        for r in rooms
    ]


# ---------------------------------------------------------------------------
# GET /admin/bookings
# ---------------------------------------------------------------------------

@router.get("/bookings", response_model=list[BookingResponse])
async def get_all_bookings(
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_db),
) -> list[BookingResponse]:
    repo = AdminRepository(session)
    bookings = await repo.get_all_bookings(skip=skip, limit=limit)

    results = []
    for b in bookings:
        if b.special_requests and b.special_requests.startswith("Manual booking for guest: "):
            guest_name = b.special_requests[len("Manual booking for guest: "):]
        elif b.user:
            guest_name = b.user.full_name
        else:
            guest_name = f"user_id:{b.user_id}"

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
# POST /admin/rooms
# ---------------------------------------------------------------------------

@router.post("/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room: RoomCreate,
    session: AsyncSession = Depends(get_db),
) -> RoomResponse:
    repo = AdminRepository(session)

    room_data = {
        "room_number": room.room_number,
        "room_type": room.type,
        "price_per_night": room.price_per_night,
        "capacity": 1,
    }

    new_room = await repo.create_room(room_data)
    await session.commit()
    await session.refresh(new_room)

    return RoomResponse(
        id=new_room.id,
        room_number=new_room.room_number,
        type=new_room.room_type,
        price_per_night=float(new_room.price_per_night),
    )


# ---------------------------------------------------------------------------
# POST /admin/bookings/manual
# ---------------------------------------------------------------------------

@router.post("/bookings/manual", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_booking(
    booking: ManualBookingCreate,
    session: AsyncSession = Depends(get_db),
) -> BookingResponse:
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

    admin_id = await _get_any_admin_id(session)
    repo = AdminRepository(session)

    booking_data = {
        "user_id": admin_id,
        "room_id": booking.room_id,
        "check_in_date": check_in,
        "check_out_date": check_out,
        "total_price": 0.0,
        "status": "confirmed",
        "special_requests": f"Manual booking for guest: {booking.guest_name}",
    }

    new_booking = await repo.create_manual_booking(booking_data)
    await session.commit()
    await session.refresh(new_booking)

    return BookingResponse(
        id=new_booking.id,
        guest_name=booking.guest_name,
        room_id=new_booking.room_id,
        start_date=str(new_booking.check_in_date),
        end_date=str(new_booking.check_out_date),
        status=new_booking.status,
    )


# ---------------------------------------------------------------------------
# PATCH /admin/bookings/{booking_id}/status
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PATCH /admin/bookings/{booking_id}  — edit booking details
# ---------------------------------------------------------------------------

@router.patch("/bookings/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    payload: BookingUpdate,
    session: AsyncSession = Depends(get_db),
) -> BookingResponse:
    from datetime import date as _date

    repo = AdminRepository(session)
    fields: dict = {}

    if payload.start_date is not None:
        try:
            fields["check_in_date"] = _date.fromisoformat(payload.start_date)
        except ValueError:
            raise HTTPException(status_code=422, detail="start_date must be YYYY-MM-DD")

    if payload.end_date is not None:
        try:
            fields["check_out_date"] = _date.fromisoformat(payload.end_date)
        except ValueError:
            raise HTTPException(status_code=422, detail="end_date must be YYYY-MM-DD")

    updated = await repo.update_booking(booking_id, fields)
    if updated is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Update guest name in special_requests if provided
    if payload.guest_name is not None:
        updated.special_requests = f"Manual booking for guest: {payload.guest_name}"
        await session.flush()

    await session.commit()
    await session.refresh(updated)

    if updated.special_requests and updated.special_requests.startswith("Manual booking for guest: "):
        guest_name = updated.special_requests[len("Manual booking for guest: "):]
    elif updated.user:
        guest_name = updated.user.full_name
    else:
        guest_name = f"user_id:{updated.user_id}"

    return BookingResponse(
        id=updated.id,
        guest_name=guest_name,
        room_id=updated.room_id,
        start_date=str(updated.check_in_date),
        end_date=str(updated.check_out_date),
        status=updated.status,
    )


ALLOWED_STATUSES = {"pending", "confirmed", "cancelled", "completed"}

@router.patch("/bookings/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(
    booking_id: int,
    payload: BookingStatusUpdate,
    session: AsyncSession = Depends(get_db),
) -> BookingResponse:
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"status must be one of {sorted(ALLOWED_STATUSES)}",
        )

    repo = AdminRepository(session)
    updated = await repo.update_booking_status(booking_id, payload.status)

    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    await session.commit()

    if updated.special_requests and updated.special_requests.startswith("Manual booking for guest: "):
        guest_name = updated.special_requests[len("Manual booking for guest: "):]
    elif updated.user:
        guest_name = updated.user.full_name
    else:
        guest_name = f"user_id:{updated.user_id}"

    return BookingResponse(
        id=updated.id,
        guest_name=guest_name,
        room_id=updated.room_id,
        start_date=str(updated.check_in_date),
        end_date=str(updated.check_out_date),
        status=updated.status,
    )
