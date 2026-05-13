from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, model_validator


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class BookingCreate(BaseModel):
    room_id: UUID
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_dates(self) -> "BookingCreate":
        today = date.today()
        if self.start_date < today:
            raise ValueError("start_date must be today or in the future")
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self


class BookingPublic(BaseModel):
    id: UUID
    room_id: UUID
    user_id: UUID
    start_date: date
    end_date: date
    status: BookingStatus
    total_cost: float  # bel EGP — el 7esab: 3adad el layali × price_per_night
    created_at: datetime  # Cairo time (UTC+2) — wa2t el 7agz fe masr


class BookingStatusUpdate(BaseModel):
    status: BookingStatus
