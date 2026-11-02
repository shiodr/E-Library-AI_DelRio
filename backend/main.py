"""ASGI entry point recognized by Wasmer's FastAPI template."""

from app.main import app

__all__ = ["app"]

if __name__ == "__main__":
    import os

    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
