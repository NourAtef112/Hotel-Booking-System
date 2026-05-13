from fastapi import APIRouter

from app.mocks.bookings import MOCK_BOOKINGS
from app.schemas.booking import BookingCreate, BookingPublic
from app.schemas.common import ErrorResponse

router = APIRouter(prefix="/bookings", tags=["bookings"])


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
    return MOCK_BOOKINGS[0]


@router.get(
    "/me",
    response_model=list[BookingPublic],
    status_code=200,
)
async def my_bookings() -> list[BookingPublic]:
    return MOCK_BOOKINGS
