"""
booking.py — SQLAlchemy ORM model for the Booking entity.
Table definition only. No business logic.
"""


class Booking:
    """
    Represents a room booking made by a user.

    TODO: Convert to SQLAlchemy model:

    __tablename__ = "bookings"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=False)
    room_id          = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    check_in_date    = Column(Date, nullable=False)
    check_out_date   = Column(Date, nullable=False)
    total_price      = Column(Numeric(10,2), nullable=False)
    status           = Column(Enum("pending","confirmed","cancelled","completed"), default="pending")
    special_requests = Column(Text, nullable=True)
    created_at       = Column(DateTime, server_default=func.now())
    updated_at       = Column(DateTime, onupdate=func.now())

    user = relationship("User", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
    """
    pass
