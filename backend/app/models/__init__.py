# models package — SQLAlchemy ORM entity definitions
from app.db.base import Base
from app.models.user import User
from app.models.room import Room
from app.models.booking import Booking

# Export models and Base to ensure Alembic discovers all tables.
__all__ = ["Base", "User", "Room", "Booking"]
