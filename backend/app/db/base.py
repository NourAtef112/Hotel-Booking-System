"""
base.py — SQLAlchemy declarative base.
Used by all ORM models. No logic here.
"""

from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass

