import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.models import Book, Download, Favorite
from app.schemas.library import (
    BookAction,
    DownloadOutput,
    DownloadPage,
    DownloadResult,
    FavoriteOutput,
    FavoritePage,
)
from app.services.auth import require_session
from app.services.library import (
    download_allowance,
    download_owner,
    record_download,
    remove_favorite,
    require_registered,
    save_favorite,
)

router = APIRouter(tags=["Library"])
Database = Annotated[DBSession, Depends(get_db)]


@router.get("/favorites", response_model=FavoritePage)
def favorites(
    request: Request, db: Database, limit: int = Query(12, ge=1, le=50), offset: int = Query(0, ge=0)
):
    user_id = require_registered(require_session(request, db))
    total = db.scalar(select(func.count()).select_from(Favorite).where(Favorite.user_id == user_id))
    rows = db.execute(
        select(Favorite, Book)
        .join(Book, Favorite.book_id == Book.id)
        .where(Favorite.user_id == user_id)
        .order_by(Favorite.created_at.desc(), Favorite.id)
        .limit(limit)
        .offset(offset)
    )
    return FavoritePage(
        items=[FavoriteOutput(id=f.id, book=b, created_at=f.created_at) for f, b in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/favorites", response_model=FavoriteOutput, status_code=201)
def add_favorite(data: BookAction, request: Request, response: Response, db: Database):
    favorite, book, created = save_favorite(db, require_session(request, db), data.book_id)
    response.status_code = 201 if created else 200
    return FavoriteOutput(id=favorite.id, book=book, created_at=favorite.created_at)


@router.delete("/favorites/{book_id}", status_code=204)
def delete_favorite(book_id: uuid.UUID, request: Request, db: Database):
    remove_favorite(db, require_session(request, db), book_id)
    return Response(status_code=204)


@router.get("/downloads", response_model=DownloadPage)
def downloads(
    request: Request, db: Database, limit: int = Query(12, ge=1, le=50), offset: int = Query(0, ge=0)
):
    session = require_session(request, db)
    allowance = download_allowance(db, session)
    rows = db.execute(
        select(Download, Book)
        .join(Book, Download.book_id == Book.id)
        .where(download_owner(session))
        .order_by(Download.downloaded_at.desc(), Download.id)
        .limit(limit)
        .offset(offset)
    )
    return DownloadPage(
        items=[DownloadOutput(id=d.id, book=b, downloaded_at=d.downloaded_at) for d, b in rows],
        total=allowance.used,
        limit=limit,
        offset=offset,
        allowance=allowance,
    )


@router.post("/downloads", response_model=DownloadResult, status_code=201)
def add_download(data: BookAction, request: Request, response: Response, db: Database):
    download, book, created, allowance = record_download(db, require_session(request, db), data.book_id)
    response.status_code = 201 if created else 200
    return DownloadResult(
        id=download.id,
        book=book,
        downloaded_at=download.downloaded_at,
        already_downloaded=not created,
        allowance=allowance,
    )
