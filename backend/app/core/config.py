"""
config.py — Application configuration via environment variables.
Uses pydantic-settings with Pydantic v2 model_config (SettingsConfigDict).
"""

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

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/guest_housing"

    # Authentication
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

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
