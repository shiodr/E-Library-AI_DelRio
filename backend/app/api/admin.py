"""Role-protected catalog administration using the shared database and sessions."""

import uuid
from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.models import Book, Download, User
from app.schemas.books import BookOutput, BookPage, CategoryOutput
from app.services.auth import require_session
from app.services.library import lock_owner

router = APIRouter(prefix="/admin", tags=["Administration"])
Database = Annotated[DBSession, Depends(get_db)]
# Serialize short administrator catalog writes, including case-insensitive duplicate checks.
CATALOG_WRITE_LOCK = 73100401


def require_admin(request: Request, db: Database) -> User:
    session = require_session(request, db)
    if session.session_type != "user" or session.user_id is None:
        raise HTTPException(403, "Administrator access is required.")
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        session = lock_owner(db, session)
    user = db.scalar(
        select(User).where(User.id == session.user_id).execution_options(populate_existing=True)
    )
    if user is None or user.role != "admin":
        raise HTTPException(403, "Administrator access is required.")
    return user


Administrator = Annotated[User, Depends(require_admin)]


class BookInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=255)
    author: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=1, max_length=10000)
    cover_url: str | None = Field(default=None, max_length=500)
    source_url: str = Field(min_length=1, max_length=500)
    license_type: str = Field(min_length=1, max_length=255)
    access_type: Literal["free_to_read", "paid"] = "free_to_read"

    @field_validator("cover_url", mode="before")
    @classmethod
    def empty_cover_is_none(cls, value):
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("cover_url", "source_url")
    @classmethod
    def authorized_https_url(cls, value: str | None):
        if value is None:
            return value
        try:
            parsed = urlsplit(value)
            valid = (
                parsed.scheme == "https" and parsed.hostname
                and parsed.username is None and parsed.password is None
                and not any(character.isspace() or ord(character) < 32 for character in value)
            )
            # Accessing port validates malformed authority values as well.
            _ = parsed.port
        except ValueError:
            valid = False
        if not valid:
            raise ValueError("Use an HTTPS URL without embedded credentials.")
        return value


class RecentDownload(BaseModel):
    id: uuid.UUID
    book: BookOutput
    downloaded_at: datetime
    owner_type: Literal["registered", "guest"]
    event_type: Literal["tracking_demo"] = "tracking_demo"


class Overview(BaseModel):
    total_books: int
    active_books: int
    archived_books: int
    registered_users: int
    total_downloads: int
    categories: list[CategoryOutput]
    recent_books: list[BookOutput]
    recent_downloads: list[RecentDownload]


@router.get("/overview", response_model=Overview)
def overview(db: Database, administrator: Administrator):
    total, active = db.execute(select(
        func.count(Book.id), func.count(Book.id).filter(Book.is_active.is_(True)),
    )).one()
    categories = db.execute(
        select(Book.category, func.count()).group_by(Book.category).order_by(Book.category)
    )
    recent_downloads = db.execute(
        select(Download, Book).join(Book, Download.book_id == Book.id)
        .order_by(Download.downloaded_at.desc(), Download.id).limit(5)
    )
    return Overview(
        total_books=total,
        active_books=active,
        archived_books=total - active,
        registered_users=db.scalar(select(func.count()).select_from(User)) or 0,
        total_downloads=db.scalar(select(func.count()).select_from(Download)) or 0,
        categories=[CategoryOutput(name=name, count=count) for name, count in categories],
        recent_books=[BookOutput.model_validate(book) for book in db.scalars(
            select(Book).order_by(Book.created_at.desc(), Book.id).limit(5)
        )],
        recent_downloads=[RecentDownload(
            id=download.id, book=BookOutput.model_validate(book), downloaded_at=download.downloaded_at,
            owner_type="registered" if download.user_id is not None else "guest",
        ) for download, book in recent_downloads],
    )


@router.get("/books", response_model=BookPage)
def books(
    db: Database,
    administrator: Administrator,
    q: str = Query(default="", max_length=150),
    category: str | None = Query(default=None, max_length=80),
    status: Literal["all", "active", "archived"] = "all",
    limit: int = Query(default=12, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
):
    statement = select(Book)
    if q.strip():
        escaped = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        statement = statement.where(or_(
            Book.title.ilike(pattern, escape="\\"), Book.author.ilike(pattern, escape="\\"),
            Book.category.ilike(pattern, escape="\\"),
        ))
    if category:
        statement = statement.where(Book.category == category)
    if status != "all":
        statement = statement.where(Book.is_active.is_(status == "active"))
    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    items = db.scalars(
        statement.order_by(Book.created_at.desc(), Book.id).limit(limit).offset(offset)
    ).all()
    return BookPage(items=items, total=total, limit=limit, offset=offset)


def catalog_write_lock(db: DBSession):
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": CATALOG_WRITE_LOCK})


def ensure_unique_book(db: DBSession, data: BookInput, book_id: uuid.UUID | None = None):
    statement = select(Book.id).where(or_(
        Book.source_url == data.source_url,
        and_(func.lower(func.btrim(Book.title)) == data.title.lower(),
             func.lower(func.btrim(Book.author)) == data.author.lower()),
    ))
    if book_id is not None:
        statement = statement.where(Book.id != book_id)
    if db.scalar(statement) is not None:
        raise HTTPException(409, "A book with this title and author or source URL already exists.")


def commit_book(db: DBSession, book: Book) -> Book:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "The book conflicts with an existing catalog record.") from None
    return book


def managed_book(db: DBSession, book_id: uuid.UUID) -> Book:
    book = db.scalar(select(Book).where(Book.id == book_id).with_for_update())
    if book is None:
        raise HTTPException(404, "Book not found.")
    book.is_managed_by_admin = True
    return book


@router.post("/books", response_model=BookOutput, status_code=201)
def add_book(data: BookInput, db: Database, administrator: Administrator):
    catalog_write_lock(db)
    ensure_unique_book(db, data)
    book = Book(**data.model_dump(), is_active=True, is_managed_by_admin=True)
    db.add(book)
    return commit_book(db, book)


@router.put("/books/{book_id}", response_model=BookOutput)
def edit_book(book_id: uuid.UUID, data: BookInput, db: Database, administrator: Administrator):
    catalog_write_lock(db)
    book = managed_book(db, book_id)
    ensure_unique_book(db, data, book_id)
    for field, value in data.model_dump().items():
        setattr(book, field, value)
    return commit_book(db, book)


@router.post("/books/{book_id}/archive", response_model=BookOutput)
def archive_book(book_id: uuid.UUID, db: Database, administrator: Administrator):
    catalog_write_lock(db)
    book = managed_book(db, book_id)
    book.is_active = False
    return commit_book(db, book)


@router.post("/books/{book_id}/restore", response_model=BookOutput)
def restore_book(book_id: uuid.UUID, db: Database, administrator: Administrator):
    catalog_write_lock(db)
    book = managed_book(db, book_id)
    book.is_active = True
    return commit_book(db, book)
