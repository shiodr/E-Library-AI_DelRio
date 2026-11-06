import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.models import Session, User
from app.schemas.auth import AuthOutput, ProfileOutput, UserOutput
from app.services.library import download_allowance

# A single lane works in both native Python and WASIX; retain the 64 MiB / three-pass cost.
hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=1, type=Type.ID)
# Equal-cost password verification also applies when an email does not exist.
dummy_hash = hasher.hash(secrets.token_urlsafe(32))


def token_hash(token: str) -> str:
    secret = get_settings().session_token_secret
    if token.startswith("v1.") and secret:
        return hmac.new(secret.get_secret_value().encode(), token.encode(), hashlib.sha256).hexdigest()
    return hashlib.sha256(token.encode()).hexdigest()


def request_token(request: Request) -> str | None:
    authorization = request.headers.get("Authorization")
    if authorization is not None:
        scheme, _, token = authorization.partition(" ")
        return token if scheme.lower() == "bearer" and token else None
    return request.cookies.get(get_settings().session_cookie_name)


def find_session(db: DBSession, token: str | None) -> Session | None:
    if not token or len(token) > 256:
        return None
    if token.startswith("v1.") and not get_settings().session_token_secret:
        return None
    return db.scalar(
        select(Session).where(
            Session.session_token_hash == token_hash(token),
            Session.revoked_at.is_(None),
            Session.expires_at > datetime.now(UTC),
        )
    )


def require_session(request: Request, db: DBSession) -> Session:
    session = find_session(db, request_token(request))
    if not session:
        raise HTTPException(
            401, "Your session has expired. Please sign in again.", headers={"WWW-Authenticate": "Bearer"}
        )
    return session


def profile(db: DBSession, session: Session) -> ProfileOutput:
    user = db.get(User, session.user_id) if session.user_id else None
    allowance = download_allowance(db, session)
    return ProfileOutput(
        session_type=session.session_type,
        expires_at=session.expires_at,
        user=UserOutput.model_validate(user) if user else None,
        planned_download_limit=allowance.limit,
        download_limit=allowance.limit,
        downloads_used=allowance.used,
        downloads_remaining=allowance.remaining,
    )


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def _write_web_cookie(response: Response, value: str = "", max_age: int = 0, *, partitioned: bool = False):
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=value,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        max_age=max_age,
        expires=0 if max_age == 0 else None,
        path="/api/v1",
    )
    if partitioned:
        # Python 3.13/WASIX cannot use Starlette's Python 3.14-only partitioned argument.
        # Append the standard flag to this cookie only; retain Starlette's value escaping.
        name, header = response.raw_headers[-1]
        response.raw_headers[-1] = (name, header + b"; Partitioned")


def set_web_session_cookie(response: Response, token: str, max_age: int):
    settings = get_settings()
    partitioned = settings.session_cookie_secure and settings.session_cookie_samesite == "none"
    if partitioned:
        # Retire the legacy cookie so two same-name cookie stores cannot select a revoked session.
        _write_web_cookie(response)
    _write_web_cookie(response, token, max_age, partitioned=partitioned)


def clear_web_session_cookie(response: Response):
    settings = get_settings()
    partitioned = settings.session_cookie_secure and settings.session_cookie_samesite == "none"
    _write_web_cookie(response, partitioned=partitioned)
    if partitioned:
        _write_web_cookie(response)


def issue_session(
    db: DBSession, request: Request, response: Response, user: User | None, client: str
) -> AuthOutput:
    settings = get_settings()
    previous = find_session(db, request_token(request))
    if previous:
        previous.revoked_at = datetime.now(UTC)
    token = ("v1." if settings.session_token_secret else "") + secrets.token_urlsafe(32)
    hours = settings.session_hours if user else settings.guest_session_hours
    session = Session(
        user_id=user.id if user else None,
        session_token_hash=token_hash(token),
        session_type="user" if user else "guest",
        expires_at=datetime.now(UTC) + timedelta(hours=hours),
    )
    db.add(session)
    db.commit()
    if client == "web":
        set_web_session_cookie(response, token, hours * 3600)
    return AuthOutput(
        **profile(db, session).model_dump(),
        access_token=token if client == "android" else None,
        token_type="bearer" if client == "android" else None,
    )
