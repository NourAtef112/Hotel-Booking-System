"""
database.py — Async SQLAlchemy engine, session factory, and FastAPI dependency.
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.models import Base

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
    pool_pre_ping=True,
    connect_args={"ssl": "require"},
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: provides an async DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def create_all_tables() -> None:
    """Create all tables on startup (idempotent — uses CREATE IF NOT EXISTS)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
