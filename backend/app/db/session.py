"""
session.py — Async database session factory.
Placeholder only. No real DB connection established.
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.config import settings

# Robust connection pooling config for 5000+ users concurrency
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,           # Baseline connections in pool
    max_overflow=10,        # Additional connections allowed during burst
    pool_timeout=30,        # Seconds to wait before giving up on getting a connection
    pool_recycle=1800       # Recycle connections after 30 minutes to prevent stale DB drops
)

AsyncSessionLocal = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides an async DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            # We don't automatically commit here to let the services manage transactions explicitly.
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
