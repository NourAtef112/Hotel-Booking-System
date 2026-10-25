from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class BookingCreate(BaseModel):
    room_id: int
    start_date: date
    end_date: date
    special_requests: Optional[str] = Field(default=None, max_length=1000)
    phone_number:     Optional[str] = Field(default=None, max_length=30)
    university_id:    Optional[str] = Field(default=None, max_length=50)
    national_id:      Optional[str] = Field(default=None, max_length=50)

    @model_validator(mode="after")
    def validate_dates(self) -> "BookingCreate":
        today = date.today()
        if self.start_date < today:
            raise ValueError("Check-in date cannot be in the past.")
        if self.start_date >= self.end_date:
            raise ValueError("Check-out date must be after the check-in date.")
        if (self.end_date - self.start_date).days > 30:
            raise ValueError("Bookings are limited to 30 nights.")
        return self


class BookingPublic(BaseModel):
    id: int
    room_id: int
    user_id: int
    start_date: date
    end_date: date
    status: BookingStatus
    total_cost: float  # bel EGP — el 7esab: 3adad el layali × price_per_night
    created_at: datetime  # Cairo time (UTC+2) — wa2t el 7agz fe masr

    model_config = {"from_attributes": True}


class BookingStatusUpdate(BaseModel):
    status: BookingStatus
