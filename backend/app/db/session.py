"""
session.py — Async database session factory.
Placeholder only. No real DB connection established.
"""

# TODO: Implement async session when DB is configured
#
# from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
# from app.core.config import settings
#
# engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
# AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
#
# async def get_db():
#     """FastAPI dependency that provides a DB session per request."""
#     async with AsyncSessionLocal() as session:
#         try:
#             yield session
#             await session.commit()
#         except Exception:
#             await session.rollback()
#             raise
#         finally:
#             await session.close()


async def get_db():
    """
    FastAPI dependency: yields a database session.
    TODO: Replace with real async session (see comments above)
    """
    pass
