"""Authorized library actions shared by HTTP routes and future agent tools."""

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session as DBSession

from app.models import Book, Download, Favorite, Session, User
from app.schemas.library import Allowance

GUEST_DOWNLOAD_LIMIT = 5
USER_DOWNLOAD_LIMIT = 10


def download_owner(session: Session):
    return (
        Download.guest_session_id == session.id
        if session.session_type == "guest"
        else Download.user_id == session.user_id
    )


def download_allowance(db: DBSession, session: Session) -> Allowance:
    limit = GUEST_DOWNLOAD_LIMIT if session.session_type == "guest" else USER_DOWNLOAD_LIMIT
    used = db.scalar(select(func.count()).select_from(Download).where(download_owner(session))) or 0
    return Allowance(limit=limit, used=used, remaining=max(0, limit - used))


def lock_session(db: DBSession, session: Session) -> Session:
    """Serialize actions against logout, then recheck expiry after waiting for the lock."""
    locked = db.scalar(
        select(Session)
        .where(Session.id == session.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if not locked or locked.revoked_at or locked.expires_at <= datetime.now(UTC):
        raise HTTPException(401, "Your session has expired. Please sign in again.")
    return locked


def lock_owner(db: DBSession, session: Session) -> Session:
    session = lock_session(db, session)
    if session.session_type == "user":
        user_id = db.scalar(select(User.id).where(User.id == session.user_id).with_for_update())
        if user_id is None or session.expires_at <= datetime.now(UTC):
            raise HTTPException(401, "Your session has expired. Please sign in again.")
    return session


def require_registered(session: Session) -> uuid.UUID:
    if session.session_type != "user" or session.user_id is None:
        raise HTTPException(403, "Create an account to save favorites.")
    return session.user_id


def require_book(db: DBSession, book_id: uuid.UUID) -> Book:
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(404, "Book not found.")
    return book


def save_favorite(db: DBSession, session: Session, book_id: uuid.UUID) -> tuple[Favorite, Book, bool]:
    session = lock_owner(db, session)
    user_id = require_registered(session)
    book = require_book(db, book_id)
    created = db.scalar(
        insert(Favorite)
        .values(user_id=user_id, book_id=book_id)
        .on_conflict_do_nothing(constraint="uq_favorites_user_book")
        .returning(Favorite.id)
    )
    favorite = db.scalar(select(Favorite).where(Favorite.user_id == user_id, Favorite.book_id == book_id))
    db.commit()
    return favorite, book, created is not None


def remove_favorite(db: DBSession, session: Session, book_id: uuid.UUID) -> None:
    session = lock_owner(db, session)
    user_id = require_registered(session)
    from sqlalchemy import delete

    db.execute(delete(Favorite).where(Favorite.user_id == user_id, Favorite.book_id == book_id))
    db.commit()


def record_download(
    db: DBSession, session: Session, book_id: uuid.UUID
) -> tuple[Download, Book, bool, Allowance]:
    # Every device/account session shares its owner lock and the same lifetime quota.
    session = lock_owner(db, session)
    book = require_book(db, book_id)
    existing = db.scalar(select(Download).where(download_owner(session), Download.book_id == book_id))
    if existing:
        allowance = download_allowance(db, session)
        db.commit()
        return existing, book, False, allowance
    allowance = download_allowance(db, session)
    if allowance.remaining == 0:
        raise HTTPException(
            403,
            f"Download limit reached: {allowance.limit} distinct books "
            + ("per guest session." if session.session_type == "guest" else "per account."),
        )
    download = Download(
        user_id=session.user_id if session.session_type == "user" else None,
        guest_session_id=session.id if session.session_type == "guest" else None,
        book_id=book_id,
    )
    db.add(download)
    db.flush()
    allowance = download_allowance(db, session)
    db.commit()
    return download, book, True, allowance
