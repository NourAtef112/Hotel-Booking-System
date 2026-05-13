"""
config.py — Application configuration via environment variables.
Uses pydantic-settings for type-safe config loading.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or .env file.
    All values have sensible defaults for local development.
    """

    # Application
    APP_NAME: str = "University Guest Housing Booking System"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development | staging | production

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/guest_housing"

    # Authentication
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"  # TODO: rotate via secrets manager
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8081"]

    class Config:
        env_file = "../.env"
        case_sensitive = True
        extra = "ignore"


# Singleton settings instance
settings = Settings()
