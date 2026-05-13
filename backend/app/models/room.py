"""
room.py — SQLAlchemy ORM model for the Room entity.
Table definition only. No business logic.
"""

from app.db.base import Base
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, Numeric, Text, Index
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship


class Room(Base):
    """
    Represents a physical guest housing room.
    """
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(100), nullable=False, unique=True, index=True)
    room_type = Column(Enum("single", "double", "suite", "family", name="room_type_enum"), nullable=False)
    capacity = Column(Integer, nullable=False)
    price_per_night = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum("available", "occupied", "maintenance", name="room_status_enum"), default="available", nullable=False)
    amenities = Column(ARRAY(String), default=[])
    description = Column(Text, nullable=True)
    image_url = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    bookings = relationship("Booking", back_populates="room")

    __table_args__ = (
        Index("ix_available_rooms", status, postgresql_where=(status == "available")),
    )
