import hashlib
import secrets
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select, text

from app.main import app
from app.models import Book, Download, Session, User


@pytest.fixture
def book_ids(db):
    # Extra records exercise the real ten-book boundary without expanding the production seed.
    extra = [
        Book(
            title=f"Quota fixture {i}",
            author="Test fixture",
            category="Test",
            description="Test-only catalog metadata; no files are served.",
            source_url=f"https://example.com/fixtures/{uuid.uuid4()}",
            license_type="Test metadata",
        )
        for i in range(4)
    ]
    db.add_all(extra)
    db.commit()
    ids = list(db.scalars(select(Book.id).order_by(Book.id)))
    yield [str(value) for value in ids]
    extra_ids = [book.id for book in extra]
    db.execute(delete(Download).where(Download.book_id.in_(extra_ids)))
    db.execute(delete(Book).where(Book.id.in_(extra_ids)))
    db.commit()


def download(client, book_id, headers=None):
    return client.post("/api/v1/downloads", json={"book_id": book_id}, headers=headers)


def test_guest_limit_is_five_distinct_books(client, book_ids):
    assert client.post("/api/v1/auth/guest", json={}).status_code == 201
    for index, book_id in enumerate(book_ids[:5]):
        response = download(client, book_id)
        assert response.status_code == 201
        assert response.json()["allowance"] == {"limit": 5, "used": index + 1, "remaining": 4 - index}
    assert download(client, book_ids[5]).status_code == 403
    repeat = download(client, book_ids[0])
    assert repeat.status_code == 200
    assert repeat.json()["already_downloaded"] is True
    assert client.get("/api/v1/downloads").json()["total"] == 5
    me = client.get("/api/v1/auth/me").json()
    assert me["downloads_used"] == me["download_limit"] == 5
    assert me["downloads_remaining"] == 0


def test_registered_limit_is_ten_and_survives_new_login(client, account, book_ids):
    assert client.post("/api/v1/auth/register", json=account).status_code == 201
    for book_id in book_ids[:10]:
        assert download(client, book_id).status_code == 201
    assert client.post("/api/v1/auth/logout").status_code == 204
    assert (
        client.post(
            "/api/v1/auth/login", json={"email": account["email"], "password": account["password"]}
        ).status_code
        == 200
    )
    assert download(client, book_ids[10]).status_code == 403
    assert download(client, book_ids[0]).status_code == 200
    page = client.get("/api/v1/downloads?limit=2&offset=1").json()
    assert page["total"] == 10 and len(page["items"]) == 2
    assert page["allowance"] == {"limit": 10, "used": 10, "remaining": 0}


def test_favorites_are_authorized_idempotent_and_scoped(client, account, book_ids):
    client.post("/api/v1/auth/guest", json={})
    assert client.get("/api/v1/favorites").status_code == 403
    assert client.post("/api/v1/favorites", json={"book_id": book_ids[0]}).status_code == 403
    client.post("/api/v1/auth/register", json=account)
    first = client.post("/api/v1/favorites", json={"book_id": book_ids[0]})
    repeated = client.post("/api/v1/favorites", json={"book_id": book_ids[0]})
    assert first.status_code == 201 and repeated.status_code == 200
    assert first.json()["id"] == repeated.json()["id"]
    assert client.get("/api/v1/favorites").json()["total"] == 1
    client.post("/api/v1/auth/logout")
    client.post("/api/v1/auth/register", json={**account, "email": "other@example.com"})
    assert client.get("/api/v1/favorites").json()["items"] == []
    assert client.delete(f"/api/v1/favorites/{book_ids[0]}").status_code == 204
    client.post("/api/v1/auth/login", json={"email": account["email"], "password": account["password"]})
    assert client.get("/api/v1/favorites").json()["total"] == 1
    assert client.delete(f"/api/v1/favorites/{book_ids[0]}").status_code == 204
    assert client.delete(f"/api/v1/favorites/{book_ids[0]}").status_code == 204
    assert client.get("/api/v1/favorites").json()["total"] == 0


def test_guest_downloads_are_isolated_and_revoked_sessions_cannot_write(client, book_ids):
    token = client.post("/api/v1/auth/guest", json={"client": "android"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert download(client, book_ids[0], headers).status_code == 201
    client.post("/api/v1/auth/guest", json={})
    assert client.get("/api/v1/downloads").json()["total"] == 0
    assert download(client, book_ids[0]).status_code == 201
    assert client.get("/api/v1/downloads", headers=headers).json()["total"] == 1
    client.post("/api/v1/auth/logout", headers=headers)
    assert download(client, book_ids[1], headers).status_code == 401


def concurrent_requests(tokens, ids):
    barrier = Barrier(len(tokens))

    def worker(arguments):
        token, book_id = arguments
        with TestClient(app) as worker_client:
            barrier.wait(timeout=10)
            return download(worker_client, book_id, {"Authorization": f"Bearer {token}"}).status_code

    with ThreadPoolExecutor(max_workers=len(tokens)) as pool:
        return list(pool.map(worker, zip(tokens, ids)))


def test_simultaneous_guest_requests_cannot_exceed_limit(client, book_ids):
    token = client.post("/api/v1/auth/guest", json={"client": "android"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    for book_id in book_ids[:4]:
        assert download(client, book_id, headers).status_code == 201
    statuses = concurrent_requests([token] * 4, book_ids[4:8])
    assert sorted(statuses) == [201, 403, 403, 403]
    assert client.get("/api/v1/downloads", headers=headers).json()["total"] == 5


def test_simultaneous_registered_sessions_share_account_limit(client, account, book_ids):
    first = client.post("/api/v1/auth/register", json={**account, "client": "android"}).json()["access_token"]
    second = client.post(
        "/api/v1/auth/login",
        json={"email": account["email"], "password": account["password"], "client": "android"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {first}"}
    for book_id in book_ids[:9]:
        assert download(client, book_id, headers).status_code == 201
    assert sorted(concurrent_requests([first, second], book_ids[9:11])) == [201, 403]
    assert client.get("/api/v1/downloads", headers=headers).json()["total"] == 10


def test_missing_invalid_and_forged_requests_do_not_consume_allowance(client, book_ids):
    assert client.get("/api/v1/downloads").status_code == 401
    assert download(client, book_ids[0]).status_code == 401
    client.post("/api/v1/auth/guest", json={})
    assert download(client, str(uuid.uuid4())).status_code == 404
    assert download(client, "not-a-uuid").status_code == 422
    assert (
        client.post(
            "/api/v1/downloads", json={"book_id": book_ids[0], "user_id": str(uuid.uuid4())}
        ).status_code
        == 422
    )
    assert client.get("/api/v1/downloads").json()["total"] == 0


def test_expired_session_cannot_record_download(client, db, book_ids):
    client.post("/api/v1/auth/guest", json={})
    session = db.scalar(select(Session))
    session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    assert download(client, book_ids[0]).status_code == 401


def test_session_expiring_while_waiting_for_account_lock_is_rejected(client, db, account, book_ids):
    from app.core.database import SessionLocal

    token = client.post("/api/v1/auth/register", json={**account, "client": "android"}).json()["access_token"]
    session = db.scalar(select(Session))
    expires_at = datetime.now(UTC) + timedelta(seconds=3)
    session.expires_at = expires_at
    user_id = session.user_id
    db.commit()
    with SessionLocal() as blocker, SessionLocal() as observer, ThreadPoolExecutor(max_workers=1) as pool:
        blocker.execute(select(User.id).where(User.id == user_id).with_for_update())

        def request_download():
            with TestClient(app) as worker:
                return download(worker, book_ids[0], {"Authorization": f"Bearer {token}"})

        future = pool.submit(request_download)
        try:
            deadline = time.monotonic() + 2
            while not observer.scalar(
                text(
                    "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE 'SELECT users.id%')"
                )
            ):
                observer.rollback()
                assert time.monotonic() < deadline, "Download did not wait on the account lock."
                time.sleep(0.01)
            time.sleep(max(0, (expires_at - datetime.now(UTC)).total_seconds()) + 0.05)
        finally:
            blocker.rollback()
        assert future.result(timeout=10).status_code == 401
    assert db.scalar(select(Download)) is None


def test_legacy_opaque_sessions_remain_valid(client, db):
    token = secrets.token_urlsafe(32)
    db.add(
        Session(
            session_type="guest",
            user_id=None,
            session_token_hash=hashlib.sha256(token.encode()).hexdigest(),
            expires_at=datetime.now(UTC) + timedelta(hours=1),
        )
    )
    db.commit()
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200


def test_deployed_site_cors_health_and_delete_preflight(client):
    origin = "https://elibrary-ai.wasmer.app"
    health = client.get("/health", headers={"Origin": origin})
    assert health.status_code == 200
    assert health.headers["access-control-allow-origin"] == origin
    assert health.headers["access-control-allow-credentials"] == "true"
    preflight = client.options(
        "/api/v1/favorites/00000000-0000-0000-0000-000000000000",
        headers={"Origin": origin, "Access-Control-Request-Method": "DELETE"},
    )
    assert preflight.status_code == 200
    assert "DELETE" in preflight.headers["access-control-allow-methods"]
    rejected = client.options(
        "/api/v1/downloads",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert rejected.status_code == 400
