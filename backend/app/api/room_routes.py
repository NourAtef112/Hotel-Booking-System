"""
room_routes.py — Room listing and detail endpoints.
"""

from fastapi import APIRouter, Query, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.room_schemas import RoomResponse, RoomListResponse
from app.services import room_service
from app.api.deps import get_db, get_current_user

router = APIRouter()

# ORM Room.status uses "booked"; RoomStatus schema uses "occupied"
_STATUS_MAP = {"booked": "occupied"}
# ORM Room.room_type has "vip_suite"; RoomType schema only has single/double/suite/family
_TYPE_MAP = {"vip_suite": "suite"}


def _to_room_dict(room) -> dict:
    """Map a Room ORM object to a RoomResponse-compatible dict.
    If already a dict (test mocks return dicts), pass through unchanged.
    """
    if isinstance(room, dict):
        return room
    return {
        "id": room.id,
        "name": room.room_number,
        "room_type": _TYPE_MAP.get(room.room_type, room.room_type),
        "capacity": 1 if room.room_type == "single" else 2,
        "price_per_night": float(room.price_per_night),
        "status": _STATUS_MAP.get(room.status, room.status),
        "amenities": [],
        "description": None,
        "image_url": None,
    }


@router.get("/", response_model=RoomListResponse)
async def list_rooms(
    available: Optional[bool] = Query(None, description="Filter by availability"),
    room_type: Optional[str] = Query(None, description="Filter by room type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await room_service.get_rooms(
        session, available=available, room_type=room_type, page=page, page_size=page_size
    )
    return {
        "rooms": [_to_room_dict(r) for r in result["rooms"]],
        "total": result["total"],
        "page": page,
        "page_size": page_size,
    }


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(
    room_id: int,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    room = await room_service.get_room_by_id(session, room_id)
    return _to_room_dict(room)
