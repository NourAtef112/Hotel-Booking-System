"""
user.py — SQLAlchemy ORM model for the User entity.
Table definition only. No business logic.
"""

# TODO: Import Base from app.db.base once database is configured
# from app.db.base import Base
# from sqlalchemy import Column, Integer, String, Boolean, Enum
# from sqlalchemy.orm import relationship


class User:
    """
    Represents a user of the booking system.

    Actors:
    - Student: has university_id, can book rooms
    - Staff: has university_id, can book rooms with priority
    - Guest: external visitor, no university_id required
    - Admin: manages rooms and bookings (future)

    TODO: Convert to SQLAlchemy model:

    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    full_name     = Column(String(255), nullable=False)
    email         = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(512), nullable=False)
    role          = Column(Enum("student","staff","guest","admin"), default="guest")
    university_id = Column(String(50), nullable=True)
    is_verified   = Column(Boolean, default=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, server_default=func.now())

    bookings = relationship("Booking", back_populates="user")
    """
    pass
