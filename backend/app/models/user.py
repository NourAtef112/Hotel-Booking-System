"""
user.py — SQLAlchemy ORM model for the User entity.
Table definition only. No business logic.
"""

from app.db.base import Base
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, func, Index
from sqlalchemy.orm import relationship


class User(Base):
    """
    Represents a user of the booking system.

    Actors:
    - Student: has university_id, can book rooms
    - Staff: has university_id, can book rooms with priority
    - Guest: external visitor, no university_id required
    - Admin: manages rooms and bookings (future)
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(512), nullable=False)
    role = Column(Enum("student", "staff", "guest", "admin", name="user_role_enum"), default="guest", nullable=False)
    university_id = Column(String(50), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        # Partial index for active users
        Index("ix_active_users", is_active, postgresql_where=(is_active == True)),
    )
