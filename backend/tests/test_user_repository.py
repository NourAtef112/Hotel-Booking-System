import pytest
from unittest.mock import AsyncMock, MagicMock
from app.models.user import User
from app.repositories import user_repository


@pytest.mark.asyncio
async def test_create_user_adds_and_returns_user(session):
    result = await user_repository.create_user(session, {
        "full_name": "Alice Smith",
        "email": "alice@example.com",
        "hashed_password": "hashed_pw",
        "role": "guest",
    })
    session.add.assert_called_once()
    session.flush.assert_called_once()
    session.refresh.assert_called_once()
    assert isinstance(result, User)
    assert result.email == "alice@example.com"


@pytest.mark.asyncio
async def test_get_by_email_returns_user(session):
    expected = User(id=1, full_name="Alice Smith", email="alice@example.com")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = expected
    session.execute.return_value = mock_result

    result = await user_repository.get_by_email(session, "alice@example.com")
    assert result is expected


@pytest.mark.asyncio
async def test_get_by_email_returns_none_when_not_found(session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await user_repository.get_by_email(session, "nobody@example.com")
    assert result is None


@pytest.mark.asyncio
async def test_get_by_id_returns_user(session):
    expected = User(id=42, full_name="Bob", email="bob@example.com")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = expected
    session.execute.return_value = mock_result

    result = await user_repository.get_by_id(session, 42)
    assert result is expected


@pytest.mark.asyncio
async def test_get_by_id_returns_none_when_not_found(session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await user_repository.get_by_id(session, 999)
    assert result is None


@pytest.mark.asyncio
async def test_update_user_returns_updated_user(session):
    expected = User(id=1, full_name="Alice Updated", email="alice@example.com")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = expected
    session.execute.return_value = mock_result

    result = await user_repository.update_user(session, 1, {"full_name": "Alice Updated"})
    assert result is expected
    session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_update_user_returns_none_when_not_found(session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await user_repository.update_user(session, 999, {"full_name": "Ghost"})
    assert result is None


@pytest.mark.asyncio
async def test_delete_user_executes_soft_delete(session):
    session.execute.return_value = MagicMock()

    await user_repository.delete_user(session, 1)

    session.execute.assert_called_once()
    session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_get_all_users_returns_list(session):
    users = [User(id=1, email="a@a.com"), User(id=2, email="b@b.com")]
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = users
    session.execute.return_value = mock_result

    result = await user_repository.get_all_users(session, page=1, page_size=10)
    assert result == users


@pytest.mark.asyncio
async def test_get_all_users_second_page(session):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    session.execute.return_value = mock_result

    result = await user_repository.get_all_users(session, page=2, page_size=10)
    assert result == []
