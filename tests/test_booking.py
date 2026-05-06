import pytest
from app.services.booking_service import create_booking

@pytest.mark.asyncio
async def test_room_booking_creation():
    """
    Test booking creation logic.
    EXPECTED: Should return booking object with status 'pending'.
    STATUS: This will FAIL as business logic is not implemented.
    """
    user_id = 1
    booking_payload = {
        "room_id": 101,
        "check_in": "2024-07-01",
        "check_out": "2024-07-05"
    }
    result = await create_booking(user_id, booking_payload)
    assert result["status"] == "pending"
    assert result["user_id"] == 1
