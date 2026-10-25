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
    assert s.cors_origins == ["https://housing.ejust.edu.eg", "https://admin.ejust.edu.eg"]
    assert s.PAYMENTS_ENABLED is False


def test_cors_accepts_json_list():
    s = make(ALLOWED_ORIGINS='["http://localhost:3000","http://localhost:8081"]')
    assert s.cors_origins == ["http://localhost:3000", "http://localhost:8081"]


def test_database_ssl_can_be_disabled_for_local_postgres():
    assert make(DATABASE_SSL="disable").db_connect_args == {}
    assert make().db_connect_args == {"ssl": "require"}
