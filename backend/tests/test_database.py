import runpy
import ssl
from contextlib import nullcontext
from pathlib import Path
from unittest.mock import MagicMock

import sqlalchemy
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from conftest import test_migrations_reversible as cycle_migrations
from sqlalchemy import inspect, text

from alembic import command, context
from app.models import Base


def test_migrations_apply_and_match_models():
    from app.core.database import engine

    with engine.connect() as connection:
        assert set(inspect(connection).get_table_names()) == {
            "users",
            "sessions",
            "books",
            "favorites",
            "downloads",
            "assistant_conversations",
            "assistant_rate_limits",
            "alembic_version",
        }
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []


def test_migrations_can_downgrade_then_upgrade():
    engine = cycle_migrations()
    with engine.connect() as connection:
        assert "downloads" in inspect(connection).get_table_names()
    engine.dispose()


def test_migrations_honor_private_ca_tls_setting(monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "db_ssl", True)
    monkeypatch.setattr(get_settings(), "db_ssl_verify", False)
    engine = MagicMock()
    factory = MagicMock(return_value=engine)
    monkeypatch.setattr(sqlalchemy, "create_engine", factory)
    monkeypatch.setattr(context, "is_offline_mode", lambda: False)
    monkeypatch.setattr(context, "configure", MagicMock())
    monkeypatch.setattr(context, "begin_transaction", lambda: nullcontext())
    migrate = MagicMock()
    monkeypatch.setattr(context, "run_migrations", migrate)

    runpy.run_path(str(Path(__file__).resolve().parents[1] / "alembic" / "env.py"))

    tls = factory.call_args.kwargs["connect_args"]["ssl_context"]
    assert isinstance(tls, ssl.SSLContext)
    assert tls.verify_mode == ssl.CERT_NONE
    assert tls.check_hostname is False
    migrate.assert_called_once_with()
    engine.dispose.assert_called_once_with()


def test_catalog_schema_rollback_keeps_books_and_user_history(client, db, account):
    from app.core.database import engine
    from app.services.seed import seed_catalog

    client.post("/api/v1/auth/register", json=account)
    book = client.get("/api/v1/books", params={"q": "The Rust Programming Language"}).json()["items"][0]
    assert client.post("/api/v1/favorites", json={"book_id": book["id"]}).status_code == 201
    assert client.post("/api/v1/downloads", json={"book_id": book["id"]}).status_code == 201
    counts = "SELECT (SELECT count(*) FROM books), (SELECT count(*) FROM favorites), (SELECT count(*) FROM downloads)"
    before = tuple(db.execute(text(counts)).one())
    db.commit()
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    try:
        command.downgrade(config, "0001")
        with engine.connect() as connection:
            assert tuple(connection.execute(text(counts)).one()) == before
            assert "access_type" not in {column["name"] for column in inspect(connection).get_columns("books")}
    finally:
        command.upgrade(config, "head")
        seed_catalog(db)
    assert client.get("/api/v1/favorites").json()["items"][0]["book"]["id"] == book["id"]
    assert client.get("/api/v1/downloads").json()["allowance"]["used"] == 1
