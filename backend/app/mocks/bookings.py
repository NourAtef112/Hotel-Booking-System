from datetime import date, datetime, timedelta, timezone

from app.schemas.booking import BookingPublic, BookingStatus

# Cairo time = UTC+2 — mafish DST fe masr delwa2ti
CAIRO = timezone(timedelta(hours=2))

MOCK_BOOKINGS: list[BookingPublic] = [
    BookingPublic(
        id=10,
        room_id=1,
        user_id=2,
        start_date=date(2026, 6, 10),
        end_date=date(2026, 6, 14),
        status=BookingStatus.CONFIRMED,
        total_cost=1000.00,  # 4 layali × 250 EGP (GH-101) — el 7agz da confirmed
        created_at=datetime(2026, 5, 1, 10, 30, 0, tzinfo=CAIRO),
    ),
    BookingPublic(
        id=11,
        room_id=1,
        user_id=3,
        start_date=date(2026, 7, 1),
        end_date=date(2026, 7, 3),
        status=BookingStatus.PENDING,
        total_cost=500.00,  # 2 layali × 250 EGP — lesa beta3mel review
        created_at=datetime(2026, 5, 9, 14, 0, 0, tzinfo=CAIRO),
    ),
]
