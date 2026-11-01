import os
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import make_url, text

from alembic import command

test_url = os.environ.get("TEST_DATABASE_URL")
if not test_url or not make_url(test_url).database.endswith("_test"):
    raise RuntimeError("Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test.")
# Test configuration must win over any local .env file before importing the app.
os.environ["DATABASE_URL"] = test_url
os.environ["APP_ENV"] = "test"
os.environ["SESSION_COOKIE_SECURE"] = "false"
os.environ["SESSION_COOKIE_SAMESITE"] = "lax"
os.environ["DB_SSL"] = os.environ.get("TEST_DB_SSL", "false")
os.environ["CORS_ORIGINS"] = '["http://localhost:5173", "https://localhost"]'


@pytest.fixture(scope="session", autouse=True)
def migrate_database():
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "head")
    from app.services.seed import seed

    seed()
    yield


@pytest.fixture(autouse=True)
def clean_accounts(migrate_database):
    from app.core.database import engine

    with engine.begin() as connection:
        connection.execute(text("TRUNCATE users, sessions, favorites, downloads CASCADE"))
    yield


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app, headers={"Origin": "http://localhost:5173"}) as client:
        yield client


@pytest.fixture
def db():
    from app.core.database import SessionLocal

    with SessionLocal() as session:
        yield session


@pytest.fixture
def account():
    return {"full_name": "Alex Reader", "email": "alex@example.com", "password": "a-long-test-passphrase"}


def test_migrations_reversible():
    """Only called explicitly by tests/test_database.py, never against development data."""
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    from app.services.seed import seed

    seed()
    from app.core.database import engine

    return engine
