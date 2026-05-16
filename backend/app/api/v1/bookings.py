from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.core.database import get_db
from app.repositories.sql_booking_repository import SQLBookingRepository
from app.schemas.booking import BookingCreate, BookingPublic
from app.schemas.common import ErrorResponse
from app.services.booking_service import calculate_cost

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post(
    "/",
    response_model=BookingPublic,
    status_code=201,
    responses={
        404: {"model": ErrorResponse, "description": "Room not found"},
        409: {"model": ErrorResponse, "description": "Booking overlap"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def create_booking(
    body: BookingCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingPublic:
    repo = SQLBookingRepository(db)

    room = await repo.get_room(body.room_id)
    if room is None:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "ROOM_NOT_FOUND", "message": f"Room {body.room_id} not found"},
        )

    overlapping = await repo.get_overlapping_bookings(body.room_id, body.start_date, body.end_date)
    if overlapping:
        raise HTTPException(
            status_code=409,
            detail={"error_code": "BOOKING_OVERLAP", "message": "Room is already booked for those dates"},
        )

    cost = calculate_cost(room.price_per_night, body.start_date, body.end_date)
    booking = await repo.create_booking({
        "user_id": current_user.id,
        "room_id": body.room_id,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "status": "pending",
        "total_cost": cost,
        "created_at": datetime.now(),
    })
    await db.commit()
    return BookingPublic.model_validate(booking.__dict__)


@router.get(
    "/me",
    response_model=list[BookingPublic],
    status_code=200,
)
async def my_bookings(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BookingPublic]:
    repo = SQLBookingRepository(db)
    bookings = await repo.get_bookings_for_user(current_user.id)
    return [BookingPublic.model_validate(b.__dict__) for b in bookings]
