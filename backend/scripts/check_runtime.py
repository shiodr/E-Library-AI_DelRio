"""Read-only runtime/deployment diagnostic; never prints credentials or creates accounts."""

import json
import sys

import fastapi
import pydantic
from argon2 import PasswordHasher
from sqlalchemy import text

from app.core.database import engine
from app.main import app

hasher = PasswordHasher()
assert hasher.verify(hasher.hash("runtime-self-check-only"), "runtime-self-check-only")
with engine.connect() as connection:
    assert connection.scalar(text("SELECT 1")) == 1
    revision = connection.scalar(text("SELECT version_num FROM alembic_version"))
print(
    json.dumps(
        {
            "python": sys.version.split()[0],
            "fastapi": fastapi.__version__,
            "pydantic": pydantic.__version__,
            "argon2id": "ok",
            "postgresql": "ok",
            "migration": revision,
            "routes": len(app.routes),
        }
    )
)
