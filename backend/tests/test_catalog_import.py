import json
from collections import Counter

import pytest
from sqlalchemy import select

from app.models import Book
from app.services.catalog import CATALOG_PATH, load_catalog
from app.services.seed import LEGACY_SAMPLE_URLS, seed_catalog


def test_reviewed_manifest_is_unique_and_rust_is_largest():
    entries = load_catalog()
    counts = Counter(entry.category for entry in entries)
    assert len(entries) == 200
    assert counts["Rust"] > max(value for category, value in counts.items() if category != "Rust")
    assert sum(entry.access_type == "free_to_read" for entry in entries) >= 11
    assert any(entry.access_type == "paid" for entry in entries)


def test_bad_manifest_is_rejected_before_import(tmp_path):
    entries = json.loads(CATALOG_PATH.read_text())
    entries[-1] = entries[0]
    path = tmp_path / "duplicates.json"
    path.write_text(json.dumps(entries))
    with pytest.raises(ValueError, match="duplicate"):
        load_catalog(path)


def test_catalog_import_is_idempotent_and_keeps_book_ids(db):
    before = dict(db.execute(select(Book.source_url, Book.id).where(Book.is_active.is_(True))).all())
    assert seed_catalog(db) == 200
    assert seed_catalog(db) == 200
    after = dict(db.execute(select(Book.source_url, Book.id).where(Book.is_active.is_(True))).all())
    assert before == after and len(after) == 200


def test_archive_keeps_existing_favorites_downloads_and_allowance(client, db, account):
    legacy = db.scalar(select(Book).where(Book.source_url == LEGACY_SAMPLE_URLS[0]))
    if legacy is None:
        legacy = Book(
            title="Legacy sample retained", author="Legacy fixture", category="Literature",
            description="Existing sample metadata retained for its owners.",
            source_url=LEGACY_SAMPLE_URLS[0], license_type="Public-domain sample",
        )
        db.add(legacy)
    legacy.is_active = True
    db.commit()
    identifier, title = str(legacy.id), legacy.title
    client.post("/api/v1/auth/register", json=account)
    assert client.post("/api/v1/favorites", json={"book_id": identifier}).status_code == 201
    assert client.post("/api/v1/downloads", json={"book_id": identifier}).status_code == 201

    seed_catalog(db)

    assert client.get(f"/api/v1/books/{identifier}").status_code == 404
    assert client.get("/api/v1/books").json()["total"] == 200
    saved = client.get("/api/v1/favorites").json()["items"][0]["book"]
    downloaded = client.get("/api/v1/downloads").json()
    assert saved["id"] == identifier and saved["title"] == title and saved["is_active"] is False
    assert downloaded["items"][0]["book"]["id"] == identifier
    assert downloaded["allowance"] == {"limit": 10, "used": 1, "remaining": 9}
    assert client.post("/api/v1/favorites", json={"book_id": identifier}).status_code == 404


def test_import_leaves_unrelated_catalog_entries_untouched(db):
    custom = Book(
        title="An independently maintained programming book", author="Catalog maintainer",
        category="Rust", description="A separate maintainer-owned catalog entry.",
        source_url="https://example.com/custom-programming-book", license_type="Test metadata",
    )
    db.add(custom)
    db.commit()
    try:
        seed_catalog(db)
        db.refresh(custom)
        assert custom.is_active is True
    finally:
        db.delete(custom)
        db.commit()
