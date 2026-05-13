"""
deps.py — FastAPI dependencies.
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

class CurrentUser:
    def __init__(self, id: int, role: str = "guest"):
        self.id = id
        self.role = role

async def get_current_user() -> CurrentUser:
    """
    Mock dependency to simulate an authenticated user.
    TODO: Implement JWT decoding using app.core.security.decode_access_token
    """
    return CurrentUser(id=1, role="guest")
