"""
room_schemas.py — Pydantic request/response models for rooms.
No logic — data contracts only.
"""

from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class RoomType(str, Enum):
    SINGLE = "single"
    DOUBLE = "double"
    SUITE = "suite"
    FAMILY = "family"


class RoomStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"


# --- Response Models ---

class RoomResponse(BaseModel):
    id: int
    name: str
    room_type: RoomType
    capacity: int
    price_per_night: float
    status: RoomStatus
    amenities: List[str]
    description: Optional[str]
    image_url: Optional[str]

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "Room 101",
                "room_type": "single",
                "capacity": 1,
                "price_per_night": 75.00,
                "status": "available",
                "amenities": ["wifi", "ac", "private_bathroom"],
                "description": "Comfortable single room on the first floor.",
                "image_url": "https://cdn.university.edu/rooms/101.jpg"
            }
        }


class RoomListResponse(BaseModel):
    rooms: List[RoomResponse]
    total: int
    page: int
    page_size: int
