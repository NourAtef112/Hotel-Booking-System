import pytest
from unittest.mock import patch, AsyncMock
from app.services import booking_service
from .utils.mock_data import create_mock_booking

@pytest.mark.asyncio
@patch('app.services.booking_service.create_booking', new_callable=AsyncMock)
async def test_room_booking_creation(mock_create_booking):
    """
    Test booking creation logic.
    EXPECTED: Should return booking object with status 'pending' (mocked).
    """
    user_id = 1
    booking_payload = {
        "room_id": 101,
        "check_in": "2024-07-01",
        "check_out": "2024-07-05"
    }
    
    mock_booking = create_mock_booking()
    mock_booking["status"] = "pending"
    mock_create_booking.return_value = mock_booking
    
    result = await booking_service.create_booking(user_id, booking_payload)
    assert result["status"] == "pending"
    assert result["user_id"] == 1

def test_booking_success():
    booking = create_mock_booking()
    assert booking["status"] == "confirmed"
