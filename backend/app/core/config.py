from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[2] / ".env", extra="ignore")
    app_env: Literal["development", "test", "production"] = "development"
    database_url: str | None = None
    db_host: str | None = None
    db_port: int = 5432
    db_name: str | None = None
    db_username: str | None = None
    db_password: str | None = None
    db_ssl: bool = False
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://localhost",
        "capacitor://localhost",
    ]
    session_cookie_name: str = "elibrary_session"
    session_cookie_secure: bool = False
    session_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    session_hours: int = Field(default=168, ge=1, le=720)
    guest_session_hours: int = Field(default=24, ge=1, le=168)

    @model_validator(mode="after")
    def check_configuration(self):
        if not self.database_url and not all(
            [self.db_host, self.db_name, self.db_username, self.db_password]
        ):
            raise ValueError("Set DATABASE_URL or all managed PostgreSQL DB_* credentials.")
        if self.database_url and not self.database_url.startswith("postgresql+pg8000://"):
            raise ValueError("DATABASE_URL must use postgresql+pg8000://.")
        if "*" in self.cors_origins:
            raise ValueError("CORS_ORIGINS must contain explicit trusted origins.")
        if self.app_env == "production" and not self.session_cookie_secure:
            raise ValueError("Production requires secure session cookies.")
        if self.session_cookie_samesite == "none" and not self.session_cookie_secure:
            raise ValueError("SameSite=None requires secure cookies.")
        if self.app_env == "production" and any(
            not origin.startswith(("https://", "capacitor://")) for origin in self.cors_origins
        ):
            raise ValueError("Production CORS origins must use HTTPS or capacitor://.")
        return self

    @property
    def sqlalchemy_url(self) -> str | URL:
        return self.database_url or URL.create(
            "postgresql+pg8000",
            username=self.db_username,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
