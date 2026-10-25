"""The app must refuse to start in production with unsafe development defaults."""
import pytest
from pydantic import ValidationError

from app.core.config import Settings

DB = "postgresql://u:p@localhost:5432/db"
STRONG = "x" * 48


def make(**kw):
    return Settings(_env_file=None, DATABASE_URL=DB, **kw)


def test_development_allows_defaults():
    s = make(ENVIRONMENT="development")
    assert s.SECRET_KEY == "CHANGE_ME_IN_PRODUCTION"


def test_production_rejects_default_secret():
    with pytest.raises(ValidationError, match="SECRET_KEY"):
        make(ENVIRONMENT="production", ALLOWED_ORIGINS="https://housing.ejust.edu.eg")


def test_production_rejects_wildcard_cors():
    with pytest.raises(ValidationError, match="ALLOWED_ORIGINS"):
        make(ENVIRONMENT="production", SECRET_KEY=STRONG, ALLOWED_ORIGINS="*")


def test_production_rejects_payments_without_keys():
    with pytest.raises(ValidationError, match="PAYMENTS_ENABLED"):
        make(ENVIRONMENT="production", SECRET_KEY=STRONG,
             ALLOWED_ORIGINS="https://housing.ejust.edu.eg", PAYMENTS_ENABLED=True)


def test_production_accepts_safe_config():
    s = make(ENVIRONMENT="production", SECRET_KEY=STRONG,
             ALLOWED_ORIGINS="https://housing.ejust.edu.eg, https://admin.ejust.edu.eg")
    assert s.ALLOWED_ORIGINS == ["https://housing.ejust.edu.eg", "https://admin.ejust.edu.eg"]
    assert s.PAYMENTS_ENABLED is False
