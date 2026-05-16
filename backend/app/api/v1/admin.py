from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_admin
from app.core.database import get_db
from app.repositories.sql_booking_repository import SQLBookingRepository
from app.schemas.booking import BookingPublic, BookingStatusUpdate
from app.schemas.common import ErrorResponse
from app.services.booking_service import _ALLOWED_TRANSITIONS

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/bookings",
    response_model=list[BookingPublic],
    status_code=200,
)
async def list_all_bookings(
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[BookingPublic]:
    repo = SQLBookingRepository(db)
    bookings = await repo.get_all_bookings()
    return [BookingPublic.model_validate(b.__dict__) for b in bookings]


@router.patch(
    "/bookings/{booking_id}",
    response_model=BookingPublic,
    status_code=200,
    responses={
        404: {"model": ErrorResponse, "description": "Booking not found"},
        422: {"model": ErrorResponse, "description": "Invalid status transition"},
    },
)
async def update_booking_status(
    booking_id: int,
    body: BookingStatusUpdate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> BookingPublic:
    repo = SQLBookingRepository(db)

    booking = await repo.get_booking_by_id(booking_id)
    if booking is None:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "BOOKING_NOT_FOUND", "message": f"Booking {booking_id} not found"},
        )

    new_status = body.status.value
    allowed = _ALLOWED_TRANSITIONS.get(booking.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "ILLEGAL_STATE_TRANSITION",
                "message": f"Cannot transition from '{booking.status}' to '{new_status}'",
            },
        )

    updated = await repo.update_booking_status(booking_id, new_status)
    await db.commit()
    return BookingPublic.model_validate(updated.__dict__)
