import pytest
from unittest.mock import AsyncMock, MagicMock
from app.models.room import Room
from app.repositories import room_repository


@pytest.mark.asyncio
async def test_find_all_returns_paginated_rooms(session):
    rooms = [Room(id=1, room_number="101"), Room(id=2, room_number="102")]
    count_result = MagicMock()
    count_result.scalar_one.return_value = 2
    rooms_result = MagicMock()
    rooms_result.scalars.return_value.all.return_value = rooms
    session.execute.side_effect = [count_result, rooms_result]

    result = await room_repository.find_all(session, page=1, page_size=10)
    assert result["total"] == 2
    assert len(result["rooms"]) == 2


@pytest.mark.asyncio
async def test_find_all_filters_by_status(session):
    count_result = MagicMock()
    count_result.scalar_one.return_value = 1
    rooms_result = MagicMock()
    rooms_result.scalars.return_value.all.return_value = [Room(id=1, status="available")]
    session.execute.side_effect = [count_result, rooms_result]

    result = await room_repository.find_all(session, status="available")
    assert result["rooms"][0].status == "available"


@pytest.mark.asyncio
async def test_find_by_id_returns_room(session):
    expected = Room(id=7, room_number="201")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = expected
    session.execute.return_value = mock_result

    result = await room_repository.find_by_id(session, 7)
    assert result is expected


@pytest.mark.asyncio
async def test_find_by_id_returns_none_when_not_found(session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await room_repository.find_by_id(session, 999)
    assert result is None


@pytest.mark.asyncio
async def test_create_room_adds_and_returns_room(session):
    result = await room_repository.create(session, {
        "room_number": "101",
        "room_type": "single",
        "price_per_night": 50.00,
        "status": "available",
    })
    session.add.assert_called_once()
    session.flush.assert_called_once()
    session.refresh.assert_called_once()
    assert isinstance(result, Room)
    assert result.room_number == "101"


@pytest.mark.asyncio
async def test_update_room_returns_updated_room(session):
    expected = Room(id=1, room_number="101", status="booked")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = expected
    session.execute.return_value = mock_result

    result = await room_repository.update_room(session, 1, {"capacity": 3})
    assert result is expected
    session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_update_room_returns_none_when_not_found(session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await room_repository.update_room(session, 999, {"capacity": 3})
    assert result is None


@pytest.mark.asyncio
async def test_delete_room_soft_deletes(session):
    session.execute.return_value = MagicMock()

    await room_repository.delete_room(session, 1)

    session.execute.assert_called_once()
    session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_update_room_status_returns_updated_room(session):
    expected = Room(id=1, status="occupied")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = expected
    session.execute.return_value = mock_result

    result = await room_repository.update_room_status(session, 1, "occupied")
    assert result is expected
    session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_update_room_status_returns_none_when_not_found(session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await room_repository.update_room_status(session, 999, "occupied")
    assert result is None
