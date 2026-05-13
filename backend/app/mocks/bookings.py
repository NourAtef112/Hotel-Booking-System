from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from app.schemas.booking import BookingPublic, BookingStatus

# Cairo time = UTC+2 — mafish DST fe masr delwa2ti
CAIRO = timezone(timedelta(hours=2))

MOCK_BOOKINGS: list[BookingPublic] = [
    BookingPublic(
        id=UUID("00000000-0000-0000-0002-000000000001"),
        room_id=UUID("00000000-0000-0000-0001-000000000001"),
        user_id=UUID("00000000-0000-0000-0000-000000000001"),
        start_date=date(2026, 6, 10),
        end_date=date(2026, 6, 14),
        status=BookingStatus.CONFIRMED,
        total_cost=4800.00,  # 4 layali × 1200 EGP — el 7agz da confirmed
        created_at=datetime(2026, 5, 1, 10, 30, 0, tzinfo=CAIRO),
    ),
    BookingPublic(
        id=UUID("00000000-0000-0000-0002-000000000002"),
        room_id=UUID("00000000-0000-0000-0001-000000000002"),
        user_id=UUID("00000000-0000-0000-0000-000000000003"),
        start_date=date(2026, 7, 1),
        end_date=date(2026, 7, 3),
        status=BookingStatus.PENDING,
        total_cost=1600.00,  # 2 layali × 800 EGP — lesa beta3mel review
        created_at=datetime(2026, 5, 9, 14, 0, 0, tzinfo=CAIRO),
    ),
]
