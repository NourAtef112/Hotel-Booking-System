from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserRole(str, Enum):
    GUEST = "guest"
    ADMIN = "admin"


class UserPublic(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime
