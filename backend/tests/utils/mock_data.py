def create_mock_user():
    return {
        "id": 1,
        "username": "testuser",
        "email": "testuser@example.com",
        "hashed_password": "hashed_password",
        "is_active": True,
        "is_admin": False
    }

def create_mock_room():
    return {
        "id": 101,
        "room_number": "101",
        "room_type": "single",
        "price_per_night": 50.0,
        "is_available": True
    }

def create_mock_booking():
    return {
        "id": 1001,
        "user_id": 1,
        "room_id": 101,
        "start_date": "2026-06-01",
        "end_date": "2026-06-05",
        "status": "confirmed"
    }
