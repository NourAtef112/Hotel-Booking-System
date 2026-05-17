"""
config.py — Application configuration via environment variables.
Uses pydantic-settings with Pydantic v2 model_config (SettingsConfigDict).
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "University Guest Housing Booking System"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database — required, no default (set DATABASE_URL env var; Supabase URI format accepted)
    DATABASE_URL: str

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        # Convert Supabase/Railway postgres:// or postgresql:// to asyncpg driver format
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        # Strip all query params — asyncpg uses connect_args for SSL, not URL query strings
        if "?" in v:
            v = v.split("?")[0]
        if not v.startswith("postgresql+asyncpg://"):
            raise ValueError(
                "DATABASE_URL must be a postgresql:// or postgres:// URI — "
                f"got: {v!r}"
            )
        return v

    # Authentication
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8081"]

    # Paymob Payment Gateway — loaded from .env, no defaults for secret keys
    PAYMOB_SECRET_KEY: str = ""
    PAYMOB_PUBLIC_KEY: str = ""
    PAYMOB_HMAC_KEY: str = ""
    PAYMOB_INTEGRATION_ID: str = ""
    PAYMOB_BASE_URL: str = "https://accept.paymob.com"
    BASE_URL: str = "http://localhost:8000"


settings = Settings()
