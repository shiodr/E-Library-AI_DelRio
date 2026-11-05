from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.services.assistant import ChatInput, ChatOutput, chat
from app.services.auth import require_session

router = APIRouter(prefix="/assistant", tags=["Assistant"])
Database = Annotated[Session, Depends(get_db)]


@router.get("/status")
def status(request: Request, db: Database):
    require_session(request, db)
    settings = get_settings()
    configured = bool(settings.openai_api_key and settings.openai_api_key.get_secret_value().strip())
    return {"generation_available": configured, "provider": "openai", "model": settings.openai_model if configured else None}


@router.post("/chat", response_model=ChatOutput)
def assistant_chat(data: ChatInput, request: Request, db: Database):
    return chat(db, require_session(request, db), data)
