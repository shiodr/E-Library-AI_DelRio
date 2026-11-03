import ssl

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import Settings, get_settings


def database_connect_args(settings: Settings) -> dict[str, ssl.SSLContext]:
    if not settings.db_ssl:
        return {}
    context = ssl.create_default_context()
    if not settings.db_ssl_verify:
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
    return {"ssl_context": context}


settings = get_settings()
engine = create_engine(
    settings.sqlalchemy_url,
    pool_pre_ping=True,
    connect_args=database_connect_args(settings),
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db():
    with SessionLocal() as db:
        yield db
