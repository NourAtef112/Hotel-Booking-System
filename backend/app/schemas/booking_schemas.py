"""
booking_schemas.py — Pydantic request/response models for bookings.
No logic — data contracts only.
"""

from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import date
from enum import Enum


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


# --- Request Models ---

class BookingRequest(BaseModel):
    room_id: int
    check_in_date: date
    check_out_date: date
    special_requests: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "room_id": 1,
                "check_in_date": "2024-09-01",
                "check_out_date": "2024-09-07",
                "special_requests": "Late check-in requested"
            }
        }


# --- Response Models ---

class BookingResponse(BaseModel):
    id: int
    user_id: int
    room_id: int
    check_in_date: date
    check_out_date: date
    total_price: float
    status: BookingStatus
    special_requests: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class BookingListResponse(BaseModel):
    bookings: List[BookingResponse]
    total: int
