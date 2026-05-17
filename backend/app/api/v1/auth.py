from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, DuplicateEmailError, InvalidTokenError
from app.core.firebase import verify_firebase_token_async
from app.repositories import user_repository
from app.schemas.auth import (
    FirebaseLoginRequest,
    FirebaseLoginResponse,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)
from app.schemas.common import ErrorResponse
from app.schemas.user import UserPublic
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ── FastAPI dependencies ────────────────────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db),
):
    """Decode Bearer token (Firebase ID token or custom JWT) and return the User."""
    # Try Firebase ID token first
    try:
        decoded = await verify_firebase_token_async(token)
        user = await user_repository.get_by_firebase_uid(session, decoded["uid"])
        if user:
            return user
    except Exception:
        pass
    # Fall back to custom JWT (local dev / admin)
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
    "/firebase-login",
    response_model=FirebaseLoginResponse,
    status_code=200,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid or expired Firebase token"},
    },
)
async def firebase_login(
    body: FirebaseLoginRequest,
    session: AsyncSession = Depends(get_db),
) -> FirebaseLoginResponse:
    try:
        result = await auth_service.firebase_login(session, body.id_token)
        return {"user": UserPublic.model_validate(result["user"])}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "INVALID_FIREBASE_TOKEN", "message": "Firebase token is invalid or expired"},
            headers={"WWW-Authenticate": "Bearer"},
        )


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
