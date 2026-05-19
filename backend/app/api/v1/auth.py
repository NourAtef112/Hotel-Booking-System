from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, DuplicateEmailError, InvalidTokenError
from app.schemas.auth import LoginRequest, RegisterRequest, RegisterResponse, TokenResponse
from app.schemas.common import ErrorResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ── FastAPI dependencies ────────────────────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db),
):
    """Decode Bearer token and return the authenticated User ORM object."""
    try:
        return await auth_service.get_current_user(session, token)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.to_dict(),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_admin(
    current_user=Depends(get_current_user),
):
    """Same as get_current_user but additionally enforces role == admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "FORBIDDEN", "message": "Admin access required"},
        )
    return current_user


# ── Routes ──────────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=201,
    responses={
        409: {"model": ErrorResponse, "description": "Email already registered"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def register(
    body: RegisterRequest,
    session: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    try:
        result = await auth_service.register(
            session,
            email=body.email,
            password=body.password,
            full_name=body.name,
        )
        return result
    except DuplicateEmailError as exc:
        raise HTTPException(status_code=409, detail=exc.to_dict())


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=200,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def login(
    body: LoginRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    try:
        return await auth_service.login(session, email=body.email, password=body.password)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.to_dict(),
            headers={"WWW-Authenticate": "Bearer"},
        )
