"""Import reviewed publisher offers without replacing administrator decisions."""

import json
from pathlib import Path

from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Book
from app.models.entities import BookPrice
from app.schemas.offers import PriceInput

OFFER_PATH = Path(__file__).resolve().parents[1] / "data" / "publisher_prices.json"


def seed_prices(db: Session, path: Path = OFFER_PATH) -> tuple[int, int]:
    entries = {}
    for row in json.loads(path.read_text(encoding="utf-8")):
        source = row.pop("book_source_url")
        if source in entries:
            raise ValueError("Duplicate book source in the price snapshot.")
        entries[source] = PriceInput.model_validate(row).record()
    db.execute(text("SELECT pg_advisory_xact_lock(73100401)"))
    books = db.execute(select(Book.id, Book.source_url).where(
        Book.source_url.in_(list(entries)),
        Book.access_type == "paid",
        Book.is_active.is_(True),
        Book.is_managed_by_admin.is_(False),
    )).all()
    records = [{"book_id": book_id, **entries[source]} for book_id, source in books]
    if records:
        db.execute(insert(BookPrice).values(records).on_conflict_do_nothing(index_elements=[BookPrice.book_id]))
    paid, priced = db.execute(
        select(func.count(Book.id), func.count(BookPrice.book_id))
        .outerjoin(BookPrice, BookPrice.book_id == Book.id)
        .where(Book.is_active.is_(True), Book.access_type == "paid")
    ).one()
    db.commit()
    return priced, paid


if __name__ == "__main__":
    with SessionLocal() as db:
        priced, paid = seed_prices(db)
    print(f"Verified prices available for {priced} of {paid} active paid titles.")
