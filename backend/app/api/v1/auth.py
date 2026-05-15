from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, RegisterResponse, TokenResponse
from app.schemas.common import ErrorResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=201,
    responses={
        409: {"model": ErrorResponse, "description": "Email already registered"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_db)) -> RegisterResponse:
    return await auth_service.register_user(session, body)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=200,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_db)) -> TokenResponse:
    return await auth_service.authenticate_user(session, body)

