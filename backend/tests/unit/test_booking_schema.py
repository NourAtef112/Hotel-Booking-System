import pytest
from datetime import date, timedelta

from pydantic import ValidationError

from app.schemas.booking import BookingCreate


def _tomorrow():
    return date.today() + timedelta(days=1)


def test_zero_nights_raises():
    today = date.today()
    with pytest.raises(ValidationError):
        BookingCreate(room_id=1, start_date=today, end_date=today)


def test_past_start_date_raises():
    yesterday = date.today() - timedelta(days=1)
    with pytest.raises(ValidationError):
        BookingCreate(room_id=1, start_date=yesterday, end_date=yesterday + timedelta(days=3))


def test_end_before_start_raises():
    start = _tomorrow() + timedelta(days=3)
    end = _tomorrow()
    with pytest.raises(ValidationError):
        BookingCreate(room_id=1, start_date=start, end_date=end)


def test_more_than_30_nights_raises():
    start = _tomorrow()
    with pytest.raises(ValidationError):
        BookingCreate(room_id=1, start_date=start, end_date=start + timedelta(days=31))


def test_valid_booking_created():
    start = _tomorrow()
    booking = BookingCreate(room_id=1, start_date=start, end_date=start + timedelta(days=3))
    assert booking.room_id == 1
    assert booking.start_date == start


def test_far_future_dates_accepted():
    booking = BookingCreate(room_id=1, start_date=date(2999, 1, 1), end_date=date(2999, 1, 4))
    assert booking is not None


def test_year_1900_raises():
    with pytest.raises(ValidationError):
        BookingCreate(room_id=1, start_date=date(1900, 1, 1), end_date=date(1900, 1, 4))
