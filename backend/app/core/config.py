"""
config.py — Application configuration via environment variables.
Uses pydantic-settings with Pydantic v2 model_config (SettingsConfigDict).
"""

from pydantic import field_validator, model_validator
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

    # CORS — comma-separated list in env, e.g. "https://housing.ejust.edu.eg,https://admin.ejust.edu.eg"
    ALLOWED_ORIGINS: list[str] = ["*"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def split_origins(cls, v):
        if isinstance(v, str) and not v.strip().startswith("["):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # Feature switches
    # Online card payment via Paymob. Off by default: guests pay at reception and an
    # admin confirms the booking. Turn on once the university has a Paymob merchant account.
    PAYMENTS_ENABLED: bool = False
    # Insert sample rooms on startup when the rooms table is empty. Off in production
    # so the university enters its real room inventory.
    SEED_DEMO_DATA: bool = True

    # Firebase Auth
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_CREDENTIALS_JSON: str = ""  # Service account JSON as a single-line string

    # Paymob Payment Gateway — loaded from .env, no defaults for secret keys
    PAYMOB_SECRET_KEY: str = ""
    PAYMOB_PUBLIC_KEY: str = ""
    PAYMOB_HMAC_KEY: str = ""
    PAYMOB_INTEGRATION_ID: str = ""
    PAYMOB_BASE_URL: str = "https://accept.paymob.com"
    BASE_URL: str = "http://localhost:8000"

    @model_validator(mode="after")
    def enforce_production_safety(self) -> "Settings":
        """Refuse to boot in production with development defaults."""
        if self.ENVIRONMENT.lower() != "production":
            return self
        problems = []
        if self.SECRET_KEY == "CHANGE_ME_IN_PRODUCTION" or len(self.SECRET_KEY) < 32:
            problems.append("SECRET_KEY must be set to a random value of at least 32 characters")
        if "*" in self.ALLOWED_ORIGINS:
            problems.append("ALLOWED_ORIGINS must list the real site URLs, not '*'")
        if self.DEBUG:
            problems.append("DEBUG must be false")
        if self.PAYMENTS_ENABLED and not (self.PAYMOB_SECRET_KEY and self.PAYMOB_HMAC_KEY):
            problems.append("PAYMENTS_ENABLED requires PAYMOB_SECRET_KEY and PAYMOB_HMAC_KEY")
        if problems:
            raise ValueError("Unsafe production configuration: " + "; ".join(problems))
        return self


settings = Settings()
