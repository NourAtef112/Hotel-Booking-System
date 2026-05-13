from fastapi import APIRouter

from app.mocks.users import MOCK_USERS
from app.schemas.auth import LoginRequest, RegisterRequest, RegisterResponse, TokenResponse
from app.schemas.common import ErrorResponse

router = APIRouter(prefix="/auth", tags=["auth"])

_PLACEHOLDER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_payload.mock_signature"
_TOKEN_EXPIRES_IN = 86400  # 24 hours in seconds


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=201,
    responses={
        409: {"model": ErrorResponse, "description": "Email already registered"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def register(body: RegisterRequest) -> RegisterResponse:
    return RegisterResponse(
        user=MOCK_USERS[0],
        access_token=_PLACEHOLDER_TOKEN,
        token_type="bearer",
        expires_in=_TOKEN_EXPIRES_IN,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=200,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def login(body: LoginRequest) -> TokenResponse:
    return TokenResponse(
        access_token=_PLACEHOLDER_TOKEN,
        token_type="bearer",
        expires_in=_TOKEN_EXPIRES_IN,
    )
