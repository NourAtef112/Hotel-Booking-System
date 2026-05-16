from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.schemas.auth_schemas import RegisterRequest, RegisterResponse, LoginRequest, LoginResponse
from app.repositories import user_repository
from app.core import security

router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_db)):
    existing = await user_repository.get_by_email(session, payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user_data = {
        "full_name": payload.full_name,
        "email": payload.email,
        "password_hash": security.hash_password(payload.password),
        "role": payload.role.value,
        "university_id": payload.university_id,
    }
    user = await user_repository.create_user(session, user_data)
    await session.commit()
    from app.schemas.auth_schemas import UserResponse
    return RegisterResponse(
        message="User registered successfully",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_db)):
    try:
        user = await user_repository.get_by_email(session, payload.email)
        if not user:
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        password_ok = security.verify_password(payload.password, user.password_hash)
        if not password_ok:
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        access_token = security.create_access_token(data={"sub": str(user.id)})
        from app.schemas.auth_schemas import UserResponse
        user_response = UserResponse.model_validate(user)
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_response,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    from app.schemas.auth_schemas import UserResponse
    return UserResponse.model_validate(current_user)