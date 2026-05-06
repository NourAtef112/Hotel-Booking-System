"""
auth_service.py — Business logic layer for authentication.
All functions are stubs. No implementation yet.
"""

from app.schemas.auth_schemas import RegisterRequest, LoginRequest


async def register_user(payload: RegisterRequest) -> dict:
    """
    Register a new user.
    TODO: Hash password using bcrypt
    TODO: Check if email already exists in DB
    TODO: Validate university_id for students/staff
    TODO: Send verification email
    TODO: Persist user via user_repository.create_user()
    """
    pass


async def authenticate_user(payload: LoginRequest) -> dict:
    """
    Authenticate user credentials and return JWT token.
    TODO: Look up user by email via user_repository.get_by_email()
    TODO: Verify password hash
    TODO: Generate JWT access token via core.security
    TODO: Return token + user profile
    """
    pass


async def get_current_user(token: str) -> dict:
    """
    Decode JWT token and return user data.
    TODO: Validate token signature and expiry
    TODO: Fetch user from DB by ID in token payload
    """
    pass


async def logout_user(token: str) -> None:
    """
    Invalidate a user session/token.
    TODO: Add token to blacklist (Redis or DB table)
    """
    pass
