from uuid import UUID

from fastapi import APIRouter

from app.mocks.bookings import MOCK_BOOKINGS
from app.schemas.booking import BookingPublic, BookingStatusUpdate
from app.schemas.common import ErrorResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/bookings",
    response_model=list[BookingPublic],
    status_code=200,
)
async def list_all_bookings() -> list[BookingPublic]:
    return MOCK_BOOKINGS


@router.patch(
    "/bookings/{booking_id}",
    response_model=BookingPublic,
    status_code=200,
    responses={
        404: {"model": ErrorResponse, "description": "Booking not found"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def update_booking_status(
    booking_id: UUID, body: BookingStatusUpdate
) -> BookingPublic:
    for booking in MOCK_BOOKINGS:
        if booking.id == booking_id:
            updated = booking.model_copy(update={"status": body.status})
            return updated
    from fastapi import HTTPException
    raise HTTPException(
        status_code=404,
        detail=ErrorResponse(
            error_code="BOOKING_NOT_FOUND",
            message=f"Booking {booking_id} not found",
        ).model_dump(),
    )
