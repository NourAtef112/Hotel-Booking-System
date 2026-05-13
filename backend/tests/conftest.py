import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def session():
    mock = AsyncMock(spec=AsyncSession)
    mock.flush = AsyncMock()
    mock.refresh = AsyncMock()
    mock.add = MagicMock()
    return mock
