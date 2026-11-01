import ssl

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

settings = get_settings()
engine = create_engine(
    settings.sqlalchemy_url,
    pool_pre_ping=True,
    connect_args={"ssl_context": ssl.create_default_context()} if settings.db_ssl else {},
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db():
    with SessionLocal() as db:
        yield db
