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
            raise ValueError("start_date cannot be in the past — mesh momken tebook fe zaman fat")
        if self.start_date >= self.end_date:
            raise ValueError("end_date must be after start_date — lazem te2am fel 3adad")
        if (self.end_date - self.start_date).days > 30:
            raise ValueError("Maximum booking duration is 30 nights — da 3omro mesh hotel")
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
