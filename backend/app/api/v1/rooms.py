from uuid import UUID

from fastapi import APIRouter

from app.mocks.rooms import MOCK_ROOMS
from app.schemas.common import ErrorResponse
from app.schemas.room import RoomDetail, RoomPublic

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get(
    "/",
    response_model=list[RoomPublic],
    status_code=200,
)
async def list_rooms() -> list[RoomDetail]:
    return MOCK_ROOMS


@router.get(
    "/{room_id}",
    response_model=RoomDetail,
    status_code=200,
    responses={
        404: {"model": ErrorResponse, "description": "Room not found"},
    },
)
async def get_room(room_id: UUID) -> RoomDetail:
    for room in MOCK_ROOMS:
        if room.id == room_id:
            return room
    from fastapi import HTTPException
    raise HTTPException(
        status_code=404,
        detail=ErrorResponse(
            error_code="ROOM_NOT_FOUND",
            message=f"Room {room_id} not found",
        ).model_dump(),
    )
