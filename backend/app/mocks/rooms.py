from uuid import UUID

from app.schemas.room import RoomDetail

# el as3ar kollaha bel EGP (gneih masry) — msh dollar
MOCK_ROOMS: list[RoomDetail] = [
    RoomDetail(
        id=UUID("00000000-0000-0000-0001-000000000001"),
        room_number="101",
        capacity=2,
        price_per_night=1200.00,  # 1200 EGP el lela — oda double b view 3al gineina
        is_available=True,
        image_url="https://placekitten.com/800/600",
        description="A cozy double room on the ground floor with a garden view and natural lighting.",
        amenities=["WiFi", "Air Conditioning", "Mini Fridge", "Study Desk"],
    ),
    RoomDetail(
        id=UUID("00000000-0000-0000-0001-000000000002"),
        room_number="205",
        capacity=1,
        price_per_night=800.00,  # 800 EGP el lela — oda single hadeya lel ba7ethin
        is_available=True,
        image_url="https://placekitten.com/801/600",
        description="A quiet single room on the second floor, ideal for solo researchers and visiting faculty.",
        amenities=["WiFi", "Air Conditioning", "Study Desk", "Safe"],
    ),
    RoomDetail(
        id=UUID("00000000-0000-0000-0001-000000000003"),
        room_number="312",
        capacity=4,
        price_per_night=2000.00,  # 2000 EGP el lela — sweet 3eila kebira fel door el talet
        is_available=False,
        image_url="https://placekitten.com/802/600",
        description="A spacious family suite on the third floor with separate living area and kitchenette.",
        amenities=["WiFi", "Air Conditioning", "Kitchen", "Living Room", "Two Bathrooms", "Study Desk"],
    ),
]
