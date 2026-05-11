import asyncio
import os
from decimal import Decimal
from datetime import date, timedelta
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.room import Room
from app.models.booking import Booking

async def seed_db():
    print("Seeding database...")
    async with AsyncSessionLocal() as session:
        # Create Admin User
        admin_user = User(
            full_name="System Administrator",
            email="admin@university.edu",
            password_hash="pbkdf2_sha256$29000$....", # Placeholder for actual hash
            role="admin",
            is_verified=True,
            is_active=True
        )
        
        session.add(admin_user)
        
        # Create Rooms
        rooms = []
        for i in range(1, 51):
            room_type = "single" if i <= 20 else ("double" if i <= 40 else "suite")
            capacity = 1 if room_type == "single" else (2 if room_type == "double" else 4)
            price = Decimal("50.00") if room_type == "single" else (Decimal("80.00") if room_type == "double" else Decimal("150.00"))
            
            room = Room(
                room_number=f"Room-{100 + i}",
                room_type=room_type,
                capacity=capacity,
                price_per_night=price,
                status="available",
                amenities=["Wi-Fi", "Desk"] if room_type == "single" else ["Wi-Fi", "Desk", "TV"],
                is_active=True
            )
            rooms.append(room)
            session.add(room)
            
        await session.commit()
        print("Successfully seeded admin user and 50 rooms.")

if __name__ == "__main__":
    # Ensure this script runs independently
    asyncio.run(seed_db())
