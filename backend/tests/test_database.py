from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from conftest import test_migrations_reversible as cycle_migrations
from sqlalchemy import inspect

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
            "alembic_version",
        }
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []


def test_migrations_can_downgrade_then_upgrade():
    engine = cycle_migrations()
    with engine.connect() as connection:
        assert "downloads" in inspect(connection).get_table_names()
    engine.dispose()
