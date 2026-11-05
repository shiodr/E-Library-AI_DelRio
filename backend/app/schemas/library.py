import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.books import BookOutput


class BookAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    book_id: uuid.UUID


class Allowance(BaseModel):
    limit: int
    used: int
    remaining: int


class FavoriteOutput(BaseModel):
    id: uuid.UUID
    book: BookOutput
    created_at: datetime


class FavoritePage(BaseModel):
    items: list[FavoriteOutput]
    total: int
    limit: int
    offset: int


class DownloadOutput(BaseModel):
    id: uuid.UUID
    book: BookOutput
    downloaded_at: datetime
    event_type: Literal["tracking_demo"] = "tracking_demo"


class DownloadPage(BaseModel):
    items: list[DownloadOutput]
    total: int
    limit: int
    offset: int
    allowance: Allowance


class DownloadResult(DownloadOutput):
    already_downloaded: bool
    allowance: Allowance
