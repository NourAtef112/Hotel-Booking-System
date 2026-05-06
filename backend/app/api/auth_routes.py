"""
auth_routes.py — Authentication endpoints.
Defines route paths only. No business logic.
"""

from fastapi import APIRouter, Depends
from app.schemas.auth_schemas import RegisterRequest, RegisterResponse, LoginRequest, LoginResponse

router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(payload: RegisterRequest):
    """
    POST /auth/register
    Register a new user (student, staff, or guest).
    TODO: delegate to auth_service.register_user()
    """
    pass


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    """
    POST /auth/login
    Authenticate user and return JWT token.
    TODO: delegate to auth_service.authenticate_user()
    """
    pass


@router.post("/logout")
async def logout():
    """
    POST /auth/logout
    Invalidate the current user session/token.
    TODO: implement token blacklisting
    """
    pass


@router.get("/me")
async def get_current_user():
    """
    GET /auth/me
    Return the currently authenticated user's profile.
    TODO: extract user from JWT token via dependency injection
    """
    pass
