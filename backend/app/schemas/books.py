import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, computed_field

from app.book_files import book_file
from app.schemas.offers import PriceOutput


class BookOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    author: str
    category: str
    description: str
    cover_url: str | None
    source_url: str
    license_type: str
    access_type: Literal["free_to_read", "paid"] = "free_to_read"
    is_active: bool = True
    price: PriceOutput | None = None

    @computed_field
    @property
    def download_filename(self) -> str | None:
        path = book_file(self.source_url, self.access_type) if self.is_active else None
        return path.name if path else None


class BookPage(BaseModel):
    items: list[BookOutput]
    total: int
    limit: int
    offset: int


class CategoryOutput(BaseModel):
    name: str
    count: int
