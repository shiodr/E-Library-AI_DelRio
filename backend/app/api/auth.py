from datetime import UTC
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models import User
from app.schemas.auth import AuthOutput, ClientInput, LoginInput, ProfileOutput, RegisterInput
from app.services.auth import (
    dummy_hash,
    hasher,
    issue_session,
    profile,
    require_session,
    verify_password,
)
from app.services.library import lock_session

router = APIRouter(prefix="/auth", tags=["Authentication"])
Database = Annotated[DBSession, Depends(get_db)]


@router.post("/register", response_model=AuthOutput, status_code=201)
def register(data: RegisterInput, request: Request, response: Response, db: Database):
    user = User(full_name=data.full_name, email=str(data.email), password_hash=hasher.hash(data.password))
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with that email already exists.") from None
    return issue_session(db, request, response, user, data.client)


@router.post("/login", response_model=AuthOutput)
def login(data: LoginInput, request: Request, response: Response, db: Database):
    user = db.scalar(select(User).where(User.email == str(data.email)))
    valid = verify_password(data.password, user.password_hash if user else dummy_hash)
    if not user or not valid:
        raise HTTPException(401, "Email or password is incorrect.")
    if hasher.check_needs_rehash(user.password_hash):
        user.password_hash = hasher.hash(data.password)
        # Release the user-row write lock before session rotation acquires a session lock.
        db.commit()
    return issue_session(db, request, response, user, data.client)


@router.post("/guest", response_model=AuthOutput, status_code=201)
def guest(data: ClientInput, request: Request, response: Response, db: Database):
    return issue_session(db, request, response, None, data.client)


@router.get("/me", response_model=ProfileOutput)
def me(request: Request, db: Database):
    return profile(db, require_session(request, db))


@router.post("/logout", status_code=204)
def logout(request: Request, db: Database):
    from datetime import datetime

    session = lock_session(db, require_session(request, db))
    session.revoked_at = datetime.now(UTC)
    db.commit()
    settings = get_settings()
    response = Response(status_code=204)
    response.delete_cookie(
        settings.session_cookie_name,
        path="/api/v1",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite=settings.session_cookie_samesite,
    )
    return response
