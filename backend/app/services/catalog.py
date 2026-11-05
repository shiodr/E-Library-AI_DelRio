"""Validate the reviewed metadata manifest before changing any database rows."""

import json
from collections import Counter
from datetime import date
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

CATALOG_PATH = Path(__file__).resolve().parents[1] / "data" / "programming_books.json"
CATALOG_SIZE = 200


class CatalogEntry(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=255)
    author: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=20)
    source_url: HttpUrl
    access_type: Literal["free_to_read", "paid"]
    license_type: str = Field(min_length=10, max_length=255)
    verification_url: HttpUrl
    verified_on: date


def load_catalog(path: Path = CATALOG_PATH) -> list[CatalogEntry]:
    entries = [CatalogEntry.model_validate(row) for row in json.loads(path.read_text())]
    if len(entries) != CATALOG_SIZE:
        raise ValueError(f"The reviewed catalog must contain exactly {CATALOG_SIZE} books.")
    titles = [" ".join(entry.title.casefold().split()) for entry in entries]
    sources = [str(entry.source_url).rstrip("/") for entry in entries]
    if len(set(titles)) != len(entries) or len(set(sources)) != len(entries):
        raise ValueError("The reviewed catalog contains duplicate titles or source URLs.")
    if any(entry.source_url.scheme != "https" or entry.verification_url.scheme != "https" for entry in entries):
        raise ValueError("Catalog sources must use HTTPS.")
    counts = Counter(entry.category for entry in entries)
    if counts["Rust"] <= max((count for name, count in counts.items() if name != "Rust"), default=0):
        raise ValueError("Rust must be the largest catalog category.")
    return entries
