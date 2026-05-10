import pytest
from unittest.mock import patch, AsyncMock
from app.services import auth_service
from .utils.mock_data import create_mock_user

@pytest.mark.asyncio
@patch('app.services.auth_service.register_user', new_callable=AsyncMock)
async def test_user_registration(mock_register_user):
    """
    Test user registration logic.
    EXPECTED: Should create a user and return details (mocked).
    """
    payload = {
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "password123",
        "role": "guest"
    }
    
    mock_user = create_mock_user()
    mock_user["email"] = "test@example.com"
    mock_register_user.return_value = mock_user
    
    result = await auth_service.register_user(payload)
    assert result["email"] == "test@example.com"
    assert "id" in result

@pytest.mark.asyncio
@patch('app.services.auth_service.authenticate_user', new_callable=AsyncMock)
async def test_user_login(mock_authenticate_user):
    """
    Test user login logic.
    EXPECTED: Should return access token on valid credentials (mocked).
    """
    payload = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    mock_authenticate_user.return_value = {"access_token": "mocked_jwt_token"}
    
    result = await auth_service.authenticate_user(payload)
    assert "access_token" in result
