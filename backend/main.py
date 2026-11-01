"""ASGI entry point recognized by Wasmer's FastAPI template."""

from app.main import app

__all__ = ["app"]
