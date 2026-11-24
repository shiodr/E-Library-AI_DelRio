import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Book
from app.models.entities import BookPrice
from app.schemas.books import BookOutput, BookPage, CategoryOutput

router = APIRouter(tags=["Catalog"])
Database = Annotated[Session, Depends(get_db)]


@router.get("/books", response_model=BookPage)
def books(
    db: Database,
    q: str = Query(default="", max_length=150),
    category: str | None = Query(default=None, max_length=80),
    limit: int = Query(default=12, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    access_type: Literal["free_to_read", "paid"] | None = None,
    sort: Literal["price_asc"] | None = None,
):
    statement = select(Book).where(Book.is_active.is_(True))
    if q.strip():
        escaped = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        statement = statement.where(
            or_(
                Book.title.ilike(pattern, escape="\\"),
                Book.author.ilike(pattern, escape="\\"),
                Book.description.ilike(pattern, escape="\\"),
            )
        )
    if category:
        statement = statement.where(Book.category == category)
    if access_type:
        statement = statement.where(Book.access_type == access_type)
    if sort == "price_asc" and access_type != "paid":
        raise HTTPException(422, "Price sorting is available for paid books.")
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    order = case((Book.category == "Rust", 0), else_=1)
    if sort == "price_asc":
        statement = statement.outerjoin(BookPrice, BookPrice.book_id == Book.id)
        order = BookPrice.amount_php_minor.asc().nulls_last()
    items = db.scalars(statement.order_by(order, Book.title, Book.id).offset(offset).limit(limit)).all()
    return BookPage(items=items, total=total, limit=limit, offset=offset)


@router.get("/books/{book_id}", response_model=BookOutput)
def book(book_id: uuid.UUID, db: Database):
    item = db.get(Book, book_id)
    if not item or not item.is_active:
        raise HTTPException(404, "Book not found.")
    return item


@router.get("/categories", response_model=list[CategoryOutput])
def categories(db: Database):
    rows = db.execute(
        select(Book.category, func.count()).where(Book.is_active.is_(True))
        .group_by(Book.category).order_by(case((Book.category == "Rust", 0), else_=1), Book.category)
    )
    return [CategoryOutput(name=name, count=count) for name, count in rows]
