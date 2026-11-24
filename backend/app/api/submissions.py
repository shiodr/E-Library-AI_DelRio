"""Owner-scoped submissions, administrator moderation and public resource links."""

import uuid
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.admin import Administrator, BookInput, catalog_write_lock, ensure_unique_book, managed_book
from app.core.database import get_db
from app.models import Book
from app.models.entities import CatalogSubmission
from app.schemas.offers import https_listing_url
from app.services.auth import require_session
from app.services.library import lock_owner

router = APIRouter(tags=["Author submissions"])
Database = Annotated[Session, Depends(get_db)]
ResourceKind = Literal["tutorial", "course", "documentation", "tool"]
ListingKind = Literal["book", "tutorial", "course", "documentation", "tool"]
Status = Literal["pending", "approved", "declined", "archived"]


class SubmissionInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    kind: ListingKind
    title: str = Field(min_length=1, max_length=255)
    author: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=1, max_length=10000)
    source_url: str = Field(max_length=500)
    access_type: Literal["free_to_read", "paid"]
    proof_url: str = Field(max_length=500)
    rights_attested: Literal[True]

    @field_validator("rights_attested", mode="before")
    @classmethod
    def explicit_attestation(cls, value):
        if value is not True:
            raise ValueError("Confirm that you have permission to list the work.")
        return value

    _verify_urls = field_validator("source_url", "proof_url")(https_listing_url)


class ResourceOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: ListingKind
    title: str
    author: str
    category: str
    description: str
    source_url: str
    access_type: Literal["free_to_read", "paid"]


class SubmissionOutput(ResourceOutput):
    created_at: datetime
    status: Status
    decline_reason: str | None
    published_book_id: uuid.UUID | None


class AdminSubmissionOutput(SubmissionOutput):
    proof_url: str


class ListingPage[T](BaseModel):
    items: list[T]
    total: int
    limit: int
    offset: int


class ResourcePage(ListingPage[ResourceOutput]):
    categories: list[str]


class ReviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    action: Literal["approve", "decline", "archive"]
    reason: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def verify_reason(self):
        if self.action == "decline" and not self.reason:
            raise ValueError("A decline reason is required.")
        return self


def author_id(request: Request, db: Session) -> uuid.UUID:
    session = require_session(request, db)
    if request.method == "POST":
        session = lock_owner(db, session)
    if session.session_type != "user" or session.user_id is None:
        raise HTTPException(403, "Sign in to submit and manage listings.")
    return session.user_id


def page_rows(db: Session, statement, limit: int, offset: int, *order):
    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    return db.scalars(statement.order_by(*order).offset(offset).limit(limit)).all(), total


@router.post("/submissions", response_model=SubmissionOutput, status_code=201)
def submit_listing(data: SubmissionInput, request: Request, db: Database):
    owner = author_id(request, db)
    pending = select(CatalogSubmission.id).where(
        CatalogSubmission.owner_id == owner,
        CatalogSubmission.status == "pending",
        CatalogSubmission.source_url == data.source_url,
    )
    if db.scalar(pending.limit(1)) is not None:
        raise HTTPException(409, "This source already has a pending submission on your account.")
    item = CatalogSubmission(owner_id=owner, **data.model_dump(exclude={"rights_attested"}))
    db.add(item)
    db.commit()
    return item


@router.get("/submissions", response_model=ListingPage[SubmissionOutput])
def my_submissions(request: Request, db: Database, limit: int = Query(12, ge=1, le=50), offset: int = Query(0, ge=0)):
    statement = select(CatalogSubmission).where(CatalogSubmission.owner_id == author_id(request, db))
    rows, total = page_rows(db, statement, limit, offset, CatalogSubmission.created_at.desc(), CatalogSubmission.id)
    return {"items": rows, "total": total, "limit": limit, "offset": offset}


@router.get("/admin/submissions", response_model=ListingPage[AdminSubmissionOutput])
def review_queue(db: Database, administrator: Administrator, status: Status = "pending",
                 limit: int = Query(12, ge=1, le=50), offset: int = Query(0, ge=0)):
    statement = select(CatalogSubmission).where(CatalogSubmission.status == status)
    rows, total = page_rows(db, statement, limit, offset, CatalogSubmission.created_at.desc(), CatalogSubmission.id)
    return {"items": rows, "total": total, "limit": limit, "offset": offset}


@router.post("/admin/submissions/{submission_id}/review", response_model=AdminSubmissionOutput)
def review_listing(submission_id: uuid.UUID, data: ReviewInput, db: Database, administrator: Administrator):
    catalog_write_lock(db)
    item = db.scalar(select(CatalogSubmission).where(CatalogSubmission.id == submission_id).with_for_update())
    if item is None:
        raise HTTPException(404, "Submission not found.")
    result = {"approve": "approved", "decline": "declined", "archive": "archived"}[data.action]
    if item.status == result:
        return item
    required = "approved" if data.action == "archive" else "pending"
    if item.status != required:
        raise HTTPException(409, "This submission is no longer available for that action.")
    if data.action == "approve" and item.kind == "book":
        book_data = BookInput(
            title=item.title, author=item.author, category=item.category, description=item.description,
            source_url=item.source_url, access_type=item.access_type,
            license_type="Author-authorized listing. Access is provided at the linked source.",
        )
        ensure_unique_book(db, book_data)
        book = Book(**book_data.model_dump(), is_active=True, is_managed_by_admin=True)
        db.add(book)
        db.flush()
        item.published_book_id = book.id
    elif data.action == "approve":
        duplicate = db.scalar(select(CatalogSubmission.id).where(
            CatalogSubmission.status == "approved",
            CatalogSubmission.kind != "book",
            func.rtrim(CatalogSubmission.source_url, "/") == item.source_url.rstrip("/"),
        ).limit(1))
        if duplicate is not None:
            raise HTTPException(409, "An approved resource already uses this source link.")
    elif data.action == "archive" and item.published_book_id is not None:
        managed_book(db, item.published_book_id).is_active = False
    item.status = result
    item.decline_reason = data.reason if data.action == "decline" else None
    db.commit()
    return item


@router.get("/resources", response_model=ResourcePage)
def resources(db: Database, q: str = Query("", max_length=150),
              kind: ResourceKind | None = None, category: str | None = Query(None, max_length=80),
              limit: int = Query(12, ge=1, le=50), offset: int = Query(0, ge=0)):
    published = (CatalogSubmission.status == "approved", CatalogSubmission.kind != "book")
    categories = db.scalars(
        select(CatalogSubmission.category).where(*published).distinct().order_by(CatalogSubmission.category)
    ).all()
    statement = select(CatalogSubmission).where(*published)
    if q.strip():
        pattern = "%" + q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        statement = statement.where(or_(*(
            field.ilike(pattern, escape="\\")
            for field in (CatalogSubmission.title, CatalogSubmission.author, CatalogSubmission.description)
        )))
    if kind:
        statement = statement.where(CatalogSubmission.kind == kind)
    if category:
        statement = statement.where(CatalogSubmission.category == category)
    rows, total = page_rows(db, statement, limit, offset, CatalogSubmission.title, CatalogSubmission.id)
    return {"items": rows, "total": total, "limit": limit, "offset": offset, "categories": categories}
