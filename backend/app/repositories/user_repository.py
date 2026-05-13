"""
user_repository.py — Data access layer for User entities.
"""
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User


async def create_user(session: AsyncSession, user_data: dict) -> User:
    """
    Insert a new user record into the database.
    """
    user = User(**user_data)
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


async def get_by_email(session: AsyncSession, email: str) -> Optional[User]:
    """
    Find a user by their email address.
    """
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_by_id(session: AsyncSession, user_id: int) -> Optional[User]:
    """
    Find a user by their primary key ID.
    """
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def update_user(session: AsyncSession, user_id: int, update_data: dict) -> Optional[User]:
    """
    Update user fields.
    """
    stmt = update(User).where(User.id == user_id).values(**update_data).returning(User)
    result = await session.execute(stmt)
    await session.flush()
    return result.scalar_one_or_none()


async def delete_user(session: AsyncSession, user_id: int) -> None:
    """
    Soft-delete a user record.
    """
    stmt = update(User).where(User.id == user_id).values(is_active=False)
    await session.execute(stmt)
    await session.flush()


async def get_all_users(session: AsyncSession, page: int = 1, page_size: int = 20) -> List[User]:
    """Retrieve all active users with pagination (admin use)."""
    result = await session.execute(
        select(User)
        .where(User.is_active == True)
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all()
