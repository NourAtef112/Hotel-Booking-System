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


@router.get("/", response_model=RoomListResponse)
async def list_rooms(
    available: Optional[bool] = Query(None, description="Filter by availability"),
    room_type: Optional[str] = Query(None, description="Filter by room type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """
    GET /rooms
    Return a paginated list of rooms with optional filters.
    """
    result = await room_service.get_rooms(
        session, available=available, room_type=room_type, page=page, page_size=page_size
    )
    return {
        "rooms": result["rooms"],
        "total": result["total"],
        "page": page,
        "page_size": page_size
    }


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(
    room_id: int,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """
    GET /rooms/{room_id}
    Return details for a specific room.
    """
    return await room_service.get_room_by_id(session, room_id)
