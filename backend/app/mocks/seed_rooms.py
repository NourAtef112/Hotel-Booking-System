"""
seed_rooms.py — E-JUST Guest House room data + async DB seeder.

run_seed() is called on startup (after create_all_tables).
It inserts the 5 real rooms and a default admin only if the tables are empty.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.models.models import Room, User

# ── Static seed data ────────────────────────────────────────────────────────────

ROOMS = [
    {
        "id": 1,
        "room_number": "GH-101",
        "type": "Single",
        "capacity": 1,
        "price_per_night": 250.0,
        "amenities": ["AC", "WiFi", "Private Bathroom"],
        "building": "Guest House Block A",
        "available": True,
        "image_url": "/static/rooms/gh101.jpg",
    },
    {
        "id": 2,
        "room_number": "GH-102",
        "type": "Single",
        "capacity": 1,
        "price_per_night": 250.0,
        "amenities": ["AC", "WiFi", "Private Bathroom"],
        "building": "Guest House Block A",
        "available": True,
        "image_url": "/static/rooms/gh102.jpg",
    },
    {
        "id": 3,
        "room_number": "GH-201",
        "type": "Double",
        "capacity": 2,
        "price_per_night": 400.0,
        "amenities": ["AC", "WiFi", "Private Bathroom", "Mini Fridge"],
        "building": "Guest House Block B",
        "available": True,
        "image_url": "/static/rooms/gh201.jpg",
    },
    {
        "id": 4,
        "room_number": "GH-202",
        "type": "Suite",
        "capacity": 2,
        "price_per_night": 600.0,
        "amenities": ["AC", "WiFi", "Private Bathroom", "Mini Fridge", "Sitting Area", "TV"],
        "building": "Guest House Block B",
        "available": False,
        "image_url": "/static/rooms/gh202.jpg",
    },
    {
        "id": 5,
        "room_number": "GH-301",
        "type": "VIP Suite",
        "capacity": 2,
        "price_per_night": 900.0,
        "amenities": ["AC", "WiFi", "Private Bathroom", "Kitchen", "Living Room", "TV", "Balcony"],
        "building": "Guest House Block C — VIP Wing",
        "available": True,
        "image_url": "/static/rooms/gh301.jpg",
    },
]

EXISTING_BOOKINGS = [
    {
        "id": 1,
        "room_id": 4,
        "user_id": 1,
        "start_date": "2026-05-14",
        "end_date": "2026-05-20",
        "status": "confirmed",
        "total_cost": 3600.0,
    }
]

_ROOM_TYPE_MAP = {
    "Single": "single",
    "Double": "double",
    "Suite": "suite",
    "VIP Suite": "vip_suite",
}


# ── Async seeder ────────────────────────────────────────────────────────────────

async def run_seed(session: AsyncSession) -> None:
    """Insert E-JUST rooms and default admin if the tables are empty."""
    await _seed_rooms(session)
    await _seed_admin(session)


async def _seed_rooms(session: AsyncSession) -> None:
    result = await session.execute(select(Room).limit(1))
    if result.scalar_one_or_none() is not None:
        return  # already seeded

    for r in ROOMS:
        room = Room(
            room_number=r["room_number"],
            room_type=_ROOM_TYPE_MAP[r["type"]],
            price_per_night=r["price_per_night"],
            status="available" if r["available"] else "booked",
        )
        session.add(room)

    await session.commit()


async def _seed_admin(session: AsyncSession) -> None:
    result = await session.execute(
        select(User).where(User.role == "admin").limit(1)
    )
    if result.scalar_one_or_none() is not None:
        return  # admin already exists

    admin = User(
        email="admin@ejust.edu.eg",
        hashed_password=security.hash_password("Admin123!"),
        full_name="E-JUST Admin",
        role="admin",
    )
    session.add(admin)
    await session.commit()
