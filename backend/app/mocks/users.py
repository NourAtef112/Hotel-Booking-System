from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.schemas.user import UserPublic, UserRole

# Cairo time = UTC+2 — kol el tawari5 bel wa2t el masry
CAIRO = timezone(timedelta(hours=2))

MOCK_USERS: list[UserPublic] = [
    UserPublic(
        id=UUID("00000000-0000-0000-0000-000000000001"),
        name="Alice Guest",
        email="alice@university.edu",
        role=UserRole.GUEST,  # guest 3adi — mesh admin
        created_at=datetime(2025, 9, 1, 8, 0, 0, tzinfo=CAIRO),
    ),
    UserPublic(
        id=UUID("00000000-0000-0000-0000-000000000002"),
        name="Admin User",
        email="admin@university.edu",
        role=UserRole.ADMIN,  # da el admin — 3ando kol el sala7eyat
        created_at=datetime(2025, 1, 1, 0, 0, 0, tzinfo=CAIRO),
    ),
    UserPublic(
        id=UUID("00000000-0000-0000-0000-000000000003"),
        name="Bob Guest",
        email="bob@university.edu",
        role=UserRole.GUEST,
        created_at=datetime(2025, 10, 15, 12, 0, 0, tzinfo=CAIRO),
    ),
]
