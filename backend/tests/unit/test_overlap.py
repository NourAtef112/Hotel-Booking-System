import pytest
from datetime import date

from app.services.booking_service import ranges_overlap


@pytest.mark.parametrize(
    "a_start, a_end, b_start, b_end, expected, label",
    [
        (date(2026, 5, 15), date(2026, 5, 18), date(2026, 5, 18), date(2026, 5, 21), False, "back-to-back: ALLOWED"),
        (date(2026, 5, 15), date(2026, 5, 18), date(2026, 5, 17), date(2026, 5, 20), True,  "partial overlap"),
        (date(2026, 5, 15), date(2026, 5, 18), date(2026, 5, 15), date(2026, 5, 16), True,  "contained inside"),
        (date(2026, 5, 15), date(2026, 5, 18), date(2026, 5, 19), date(2026, 5, 22), False, "fully disjoint"),
        (date(2026, 5, 15), date(2026, 5, 18), date(2026, 5, 14), date(2026, 5, 16), True,  "B starts before A"),
        (date(2026, 5, 15), date(2026, 5, 18), date(2026, 5, 15), date(2026, 5, 18), True,  "exact same dates"),
    ],
)
def test_ranges_overlap(a_start, a_end, b_start, b_end, expected, label):
    assert ranges_overlap(a_start, a_end, b_start, b_end) == expected, f"Failed: {label}"
