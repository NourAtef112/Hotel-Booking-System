"""
models.py — SQLAlchemy 2.x ORM models for User, Room, and Booking.
Single source of truth. All other model files re-export from here.
"""

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    firebase_uid = Column(String(255), unique=True, nullable=True, index=True)
    hashed_password = Column(String(512), nullable=True)
    full_name = Column(String(255), nullable=False)
    role = Column(
        Enum("guest", "admin", name="user_role"),
        default="guest",
        nullable=False,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(100), unique=True, nullable=False, index=True)
    room_type = Column(
        Enum("single", "double", "suite", "vip_suite", name="room_type"),
        nullable=False,
    )
    price_per_night = Column(Numeric(10, 2), nullable=False)
    status = Column(
        Enum("available", "booked", "maintenance", name="room_status"),
        default="available",
        nullable=False,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    bookings = relationship("Booking", back_populates="room")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    status = Column(
        Enum("pending", "confirmed", "rejected", "cancelled", name="booking_status"),
        default="pending",
        nullable=False,
    )
    total_price = Column(Numeric(10, 2), nullable=False)
    special_requests = Column(Text,        nullable=True)
    phone_number     = Column(String(30),  nullable=True)
    university_id    = Column(String(50),  nullable=True)
    national_id      = Column(String(50),  nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
