"""
auth_schemas.py — Pydantic request/response models for authentication.
No logic — data contracts only.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    STAFF = "staff"
    GUEST = "guest"
    ADMIN = "admin"


# --- Request Models ---

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.GUEST
    university_id: Optional[str] = None  # Required for students/staff

    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "Ahmed Hassan",
                "email": "ahmed@university.edu",
                "password": "SecurePass123!",
                "role": "student",
                "university_id": "STU-2024-001"
            }
        }


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "ahmed@university.edu",
                "password": "SecurePass123!"
            }
        }


# --- Response Models ---

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    university_id: Optional[str]
    is_verified: bool

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    message: str
    user: UserResponse


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
