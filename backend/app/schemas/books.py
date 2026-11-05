import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict


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


class BookPage(BaseModel):
    items: list[BookOutput]
    total: int
    limit: int
    offset: int


class CategoryOutput(BaseModel):
    name: str
    count: int
