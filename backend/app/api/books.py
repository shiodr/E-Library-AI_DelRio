import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Book
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
):
    statement = select(Book)
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
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    items = db.scalars(statement.order_by(Book.title, Book.id).offset(offset).limit(limit)).all()
    return BookPage(items=items, total=total, limit=limit, offset=offset)


@router.get("/books/{book_id}", response_model=BookOutput)
def book(book_id: uuid.UUID, db: Database):
    item = db.get(Book, book_id)
    if not item:
        raise HTTPException(404, "Book not found.")
    return item


@router.get("/categories", response_model=list[CategoryOutput])
def categories(db: Database):
    rows = db.execute(select(Book.category, func.count()).group_by(Book.category).order_by(Book.category))
    return [CategoryOutput(name=name, count=count) for name, count in rows]
