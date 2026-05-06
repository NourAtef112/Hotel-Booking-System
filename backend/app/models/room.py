"""
room.py — SQLAlchemy ORM model for the Room entity.
Table definition only. No business logic.
"""


class Room:
    """
    Represents a physical guest housing room.

    TODO: Convert to SQLAlchemy model:

    __tablename__ = "rooms"

    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String(100), nullable=False)
    room_type        = Column(Enum("single","double","suite","family"), nullable=False)
    capacity         = Column(Integer, nullable=False)
    price_per_night  = Column(Numeric(10,2), nullable=False)
    status           = Column(Enum("available","occupied","maintenance"), default="available")
    amenities        = Column(ARRAY(String), default=[])
    description      = Column(Text, nullable=True)
    image_url        = Column(String(512), nullable=True)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, server_default=func.now())

    bookings = relationship("Booking", back_populates="room")
    """
    pass
