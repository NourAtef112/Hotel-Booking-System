from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class RoomPublic(BaseModel):
    id: UUID
    room_number: str
    capacity: int
    price_per_night: float  # bel EGP (gneih masry) — msh dollar
    is_available: bool
    image_url: str | None = None


class RoomDetail(RoomPublic):
    description: str
    amenities: list[str]
