from dataclasses import dataclass

from fastapi import APIRouter, HTTPException

from app.core.exceptions import BookingOverlapError, RoomNotFoundError
from app.schemas.booking import BookingCreate, BookingPublic
from app.schemas.common import ErrorResponse
from app.services.booking_service import booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


# placeholder until real JWT auth is wired — Issue #7
@dataclass
class _MockUser:
    id: int = 1
    is_admin: bool = False


async def _get_current_user() -> _MockUser:
    return _MockUser()


@router.post(
    "/",
    response_model=BookingPublic,
    status_code=201,
    responses={
        409: {"model": ErrorResponse, "description": "Booking overlap with existing reservation"},
        404: {"model": ErrorResponse, "description": "Room not found"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def create_booking(body: BookingCreate) -> BookingPublic:
    current_user = await _get_current_user()
    try:
        booking = await booking_service.create_booking(
            user_id=current_user.id,
            room_id=body.room_id,
            start_date=body.start_date,
            end_date=body.end_date,
        )
        return BookingPublic.model_validate(booking.__dict__)
    except RoomNotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.to_dict())
    except BookingOverlapError as exc:
        raise HTTPException(status_code=409, detail=exc.to_dict())


@router.get(
    "/me",
    response_model=list[BookingPublic],
    status_code=200,
)
async def my_bookings() -> list[BookingPublic]:
    current_user = await _get_current_user()
    bookings = booking_service.get_user_bookings(current_user.id)
    return [BookingPublic.model_validate(b.__dict__) for b in bookings]
