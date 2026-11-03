from sqlalchemy import create_engine, pool

from alembic import context
from app.core.config import get_settings
from app.core.database import database_connect_args
from app.models import Base

target_metadata = Base.metadata


def run_migrations():
    settings = get_settings()
    if context.is_offline_mode():
        context.configure(url=settings.sqlalchemy_url, target_metadata=target_metadata, literal_binds=True)
        with context.begin_transaction():
            context.run_migrations()
    else:
        engine = create_engine(
            settings.sqlalchemy_url,
            poolclass=pool.NullPool,
            connect_args=database_connect_args(settings),
        )
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata)
            with context.begin_transaction():
                context.run_migrations()
        engine.dispose()


run_migrations()
