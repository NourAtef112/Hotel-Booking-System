"""
booking.py — SQLAlchemy ORM model for the Booking entity.
Table definition only. No business logic.
"""

from app.db.base import Base
from sqlalchemy import Column, Integer, ForeignKey, Date, Numeric, Enum, DateTime, Text, CheckConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ExcludeConstraint


class Booking(Base):
    """
    Represents a room booking made by a user.
    """
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    check_in_date = Column(Date, nullable=False)
    check_out_date = Column(Date, nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum("pending", "confirmed", "cancelled", "completed", name="booking_status_enum"), default="pending", nullable=False)
    special_requests = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")

    __table_args__ = (
        CheckConstraint("check_out_date > check_in_date", name="chk_valid_dates"),
        
        # PostgreSQL native GiST exclusion constraint to explicitly prevent double-bookings.
        ExcludeConstraint(
            (room_id, '='),
            (func.daterange(check_in_date, check_out_date, '()'), '&&'),
            name='uq_room_booking_dates',
            using='gist',
            where=(status.in_(['pending', 'confirmed']))
        ),
        
        # Index on check_in/check_out for general query bounds.
        Index("ix_booking_dates", check_in_date, check_out_date),
    )
