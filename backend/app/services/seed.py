"""Import reviewed programming metadata without downloading or redistributing books."""

import uuid

from sqlalchemy import select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Book
from app.services.catalog import load_catalog

LEGACY_SAMPLE_URLS = tuple(
    f"https://www.gutenberg.org/ebooks/{identifier}"
    for identifier in ("1342", "84", "11", "35", "1228", "18857", "36", "17396")
)


def seed_catalog(db: Session) -> int:
    entries = load_catalog()
    db.execute(text("SELECT pg_advisory_xact_lock(73100401)"))
    values = []
    protected = set(db.scalars(select(Book.seed_source_url).where(Book.is_managed_by_admin.is_(True))))
    for entry in entries:
        source = str(entry.source_url)
        if source in protected:
            continue
        values.append({
            "id": uuid.uuid5(uuid.NAMESPACE_URL, source),
            "title": entry.title,
            "author": entry.author,
            "category": entry.category,
            "description": entry.description,
            "cover_url": None,
            "source_url": source,
            "license_type": entry.license_type,
            "access_type": entry.access_type,
            "is_active": True,
            "seed_source_url": source,
        })
    if values:
        statement = insert(Book).values(values)
        db.execute(statement.on_conflict_do_update(
            index_elements=[Book.source_url],
            set_={key: getattr(statement.excluded, key) for key in values[0] if key != "id"},
            where=Book.is_managed_by_admin.is_(False),
        ))
    # Archive only the original known samples. Never delete books or user history.
    db.execute(update(Book).where(Book.source_url.in_(LEGACY_SAMPLE_URLS), Book.is_managed_by_admin.is_(False)).values(is_active=False))
    db.commit()
    return len(entries)


def seed():
    with SessionLocal() as db:
        count = seed_catalog(db)
    print(f"Seed complete: {count} programming records reviewed; administrator edits preserved; no book files downloaded.")


if __name__ == "__main__":
    seed()
