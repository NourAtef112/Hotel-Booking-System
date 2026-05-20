from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth as _fb_auth
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import (
    AuthenticationError,
    DuplicateEmailError,
    EmailConflictError,
    InvalidResetTokenError,
    InvalidTokenError,
)
from app.core.firebase import verify_firebase_token_async
from app.repositories import user_repository
from app.schemas.auth import (
    FirebaseLoginRequest,
    FirebaseLoginResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LogoutResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TokenResponse,
    UpdateProfileRequest,
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
    if auth_service.is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "INVALID_TOKEN", "message": "Token has been revoked"},
            headers={"WWW-Authenticate": "Bearer"},
        )
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
    except (
        _fb_auth.ExpiredIdTokenError,
        _fb_auth.InvalidIdTokenError,
        _fb_auth.RevokedIdTokenError,
        _fb_auth.UserDisabledError,
        _fb_auth.CertificateFetchError,
        ValueError,  # raised by JWT library for completely malformed tokens
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "INVALID_FIREBASE_TOKEN", "message": "Firebase token is invalid or expired"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    # All other exceptions (DB errors, Firebase init failures) propagate to generic_exception_handler → 500


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


@router.get(
    "/me",
    response_model=UserPublic,
    status_code=200,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
    },
)
async def get_me(current_user=Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(current_user)


@router.post(
    "/logout",
    response_model=LogoutResponse,
    status_code=200,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
    },
)
async def logout(
    token: str = Depends(oauth2_scheme),
    current_user=Depends(get_current_user),
) -> LogoutResponse:
    auth_service.blacklist_token(token)
    return LogoutResponse()


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    status_code=200,
)
async def forgot_password(
    body: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_db),
) -> ForgotPasswordResponse:
    reset_token = await auth_service.forgot_password(session, body.email)
    return ForgotPasswordResponse(reset_token=reset_token)


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
    status_code=200,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid or expired reset token"},
    },
)
async def reset_password(
    body: ResetPasswordRequest,
    session: AsyncSession = Depends(get_db),
) -> ResetPasswordResponse:
    try:
        await auth_service.reset_password(session, body.token, body.new_password)
        return ResetPasswordResponse()
    except InvalidResetTokenError as exc:
        raise HTTPException(status_code=400, detail=exc.to_dict())


@router.patch(
    "/me",
    response_model=UserPublic,
    status_code=200,
    responses={
        401: {"model": ErrorResponse, "description": "Wrong current password or not authenticated"},
        409: {"model": ErrorResponse, "description": "Email already taken"},
    },
)
async def update_profile(
    body: UpdateProfileRequest,
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> UserPublic:
    try:
        updated = await auth_service.update_profile(
            session,
            user_id=current_user.id,
            full_name=body.full_name,
            email=body.email,
            password=body.password,
            current_password=body.current_password,
        )
        return UserPublic.model_validate(updated)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.to_dict(),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except EmailConflictError as exc:
        raise HTTPException(status_code=409, detail=exc.to_dict())
