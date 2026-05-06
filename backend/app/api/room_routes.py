"""
room_routes.py — Room listing and detail endpoints.
Defines route paths only. No business logic.
"""

from fastapi import APIRouter, Query
from typing import Optional
from app.schemas.room_schemas import RoomResponse, RoomListResponse

router = APIRouter()


@router.get("/", response_model=RoomListResponse)
async def list_rooms(
    available: Optional[bool] = Query(None, description="Filter by availability"),
    room_type: Optional[str] = Query(None, description="Filter by room type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    """
    GET /rooms
    Return a paginated list of rooms with optional filters.
    TODO: delegate to room_service.get_rooms()
    """
    pass


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: int):
    """
    GET /rooms/{room_id}
    Return details for a specific room.
    TODO: delegate to room_service.get_room_by_id()
    """
    pass
