"""Date helpers for tests.

Tests must never hardcode calendar dates: BookingCreate rejects past start
dates, so a fixed date silently turns into a failing test once it passes.
"""
from datetime import date, timedelta


def future(days: int) -> str:
    """ISO date string `days` days from today."""
    return (date.today() + timedelta(days=days)).isoformat()
