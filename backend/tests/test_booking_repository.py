import pytest
from datetime import date
from unittest.mock import AsyncMock, MagicMock
from app.models.booking import Booking
from app.repositories import booking_repository


@pytest.mark.asyncio
async def test_create_booking_adds_and_returns_booking(session):
    result = await booking_repository.create(session, {
        "user_id": 1,
        "room_id": 5,
        "check_in": date(2025, 7, 1),
        "check_out": date(2025, 7, 5),
        "total_price": 200.00,
        "status": "pending",
    })
    session.add.assert_called_once()
    session.flush.assert_called_once()
    session.refresh.assert_called_once()
    assert isinstance(result, Booking)
    assert result.user_id == 1


@pytest.mark.asyncio
async def test_find_by_id_returns_booking(session):
    expected = Booking(id=10, user_id=1, room_id=5)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = expected
    session.execute.return_value = mock_result

    result = await booking_repository.find_by_id(session, 10)
    assert result is expected


@pytest.mark.asyncio
async def test_find_by_id_returns_none_when_not_found(session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await booking_repository.find_by_id(session, 999)
    assert result is None


@pytest.mark.asyncio
async def test_find_by_user_id_returns_bookings(session):
    bookings = [Booking(id=1, user_id=3), Booking(id=2, user_id=3)]
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = bookings
    session.execute.return_value = mock_result

    result = await booking_repository.find_by_user_id(session, 3)
    assert result == bookings


@pytest.mark.asyncio
async def test_find_all_returns_paginated_bookings(session):
    bookings = [Booking(id=1), Booking(id=2), Booking(id=3)]
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = bookings
    session.execute.return_value = mock_result

    result = await booking_repository.find_all(session, page=1, page_size=20)
    assert len(result) == 3


@pytest.mark.asyncio
async def test_find_overlapping_returns_conflicts(session):
    conflicting = [Booking(id=1, room_id=5, check_in=date(2025, 6, 1), check_out=date(2025, 6, 5))]
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = conflicting
    session.execute.return_value = mock_result

    result = await booking_repository.find_overlapping(session, 5, date(2025, 6, 3), date(2025, 6, 7))
    assert len(result) == 1


@pytest.mark.asyncio
async def test_find_overlapping_returns_empty_when_no_conflicts(session):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    session.execute.return_value = mock_result

    result = await booking_repository.find_overlapping(session, 5, date(2025, 8, 1), date(2025, 8, 5))
    assert result == []


@pytest.mark.asyncio
async def test_update_status_returns_updated_booking(session):
    expected = Booking(id=1, status="confirmed")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = expected
    session.execute.return_value = mock_result

    result = await booking_repository.update_status(session, 1, "confirmed")
    assert result is expected
    session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_update_status_returns_none_when_not_found(session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await booking_repository.update_status(session, 999, "confirmed")
    assert result is None


@pytest.mark.asyncio
async def test_find_overlapping_only_checks_active_statuses(session):
    """find_overlapping must filter on pending/confirmed — not cancelled/completed."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    session.execute.return_value = mock_result

    await booking_repository.find_overlapping(session, 5, date(2025, 6, 1), date(2025, 6, 5))

    call_args = session.execute.call_args[0][0]
    # literal_binds inlines bind parameters so we can assert on actual values
    compiled = call_args.compile(compile_kwargs={"literal_binds": True})
    query_str = str(compiled)
    assert "pending" in query_str and "confirmed" in query_str
