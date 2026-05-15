"""
seed_rooms.py — Real E-JUST Guest House room data.
El as3ar kollaha bel Gneih Masry (EGP). El ghorf GH-202 makhtooba (today = May 15, 2026).
"""

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
        "available": False,   # already occupied — shows real-time state (May 14–20)
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

# GH-202 is booked from May 14 → May 20, 2026.
# Today is May 15 — so the overlap algorithm will catch any new booking for room 4
# that overlaps with this window. Da el proof-of-concept beta3 el system.
EXISTING_BOOKINGS = [
    {
        "id": 1,
        "room_id": 4,
        "user_id": 1,
        "start_date": "2026-05-14",
        "end_date": "2026-05-20",
        "status": "confirmed",
        "total_cost": 3600.0,  # 6 layali × 600 EGP
    }
]
