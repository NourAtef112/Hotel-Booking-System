import pytest
from app.services.auth_service import register_user, authenticate_user

@pytest.mark.asyncio
async def test_user_registration():
    """
    Test user registration logic.
    EXPECTED: Should create a user and return details.
    STATUS: This will FAIL as business logic is not implemented.
    """
    payload = {
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "password123",
        "role": "guest"
    }
    result = await register_user(payload)
    assert result["email"] == "test@example.com"
    assert "id" in result

@pytest.mark.asyncio
async def test_user_login():
    """
    Test user login logic.
    EXPECTED: Should return access token on valid credentials.
    STATUS: This will FAIL as business logic is not implemented.
    """
    payload = {
        "email": "test@example.com",
        "password": "password123"
    }
    result = await authenticate_user(payload)
    assert "access_token" in result
