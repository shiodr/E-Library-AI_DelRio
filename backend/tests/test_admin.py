import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select

from app.main import app
from app.models import Book, Download, Favorite, Session, User
from app.services.seed import seed_catalog


@pytest.fixture
def administrator(client, db, account):
    result = client.post("/api/v1/auth/register", json=account)
    assert result.status_code == 201
    user = db.get(User, uuid.UUID(result.json()["user"]["id"]))
    user.role = "admin"
    db.commit()
    assert client.get("/api/v1/auth/me").json()["user"]["role"] == "admin"
    return client


@pytest.fixture
def managed_catalog(db):
    category = "Admin test " + uuid.uuid4().hex
    yield category
    db.rollback()
    ids = list(db.scalars(select(Book.id).where(Book.category == category)))
    if ids:
        db.execute(delete(Favorite).where(Favorite.book_id.in_(ids)))
        db.execute(delete(Download).where(Download.book_id.in_(ids)))
        db.execute(delete(Book).where(Book.id.in_(ids)))
        db.commit()


def book_input(catalog_category, **changes):
    token = uuid.uuid4().hex
    return {
        "title": "A maintained Rust book " + token,
        "author": "Catalog test author",
        "category": catalog_category,
        "description": "A legally authorized test catalog edition.",
        "source_url": "https://example.com/admin-test/" + token,
        "cover_url": None,
        "license_type": "Author-authorized test listing",
        "access_type": "free_to_read",
        **changes,
    }


def test_admin_routes_reject_anonymous_readers_and_guests(client, account, managed_catalog):
    book_id = uuid.uuid4()
    requests = [
        ("get", "/overview", None),
        ("get", "/books", None),
        ("post", "/books", book_input(managed_catalog)),
        ("put", f"/books/{book_id}", book_input(managed_catalog)),
        ("post", f"/books/{book_id}/archive", None),
        ("post", f"/books/{book_id}/restore", None),
    ]
    for method, path, body in requests:
        options = {} if body is None else {"json": body}
        assert getattr(client, method)("/api/v1/admin" + path, **options).status_code == 401
    client.post("/api/v1/auth/guest", json={})
    for method, path, body in requests:
        options = {} if body is None else {"json": body}
        assert getattr(client, method)("/api/v1/admin" + path, **options).status_code == 403
    client.post("/api/v1/auth/register", json=account)
    for method, path, body in requests:
        options = {} if body is None else {"json": body}
        assert getattr(client, method)("/api/v1/admin" + path, **options).status_code == 403


def test_admin_role_is_checked_again_and_sessions_expire(administrator, db):
    assert administrator.get("/api/v1/admin/overview").status_code == 200
    user = db.scalar(select(User))
    user.role = "reader"
    db.commit()
    assert administrator.get("/api/v1/admin/overview").status_code == 403
    user.role = "admin"
    session = db.scalar(select(Session))
    session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    assert administrator.get("/api/v1/admin/overview").status_code == 401


def test_admin_public_registration_cannot_assign_a_role(client, account):
    assert client.post("/api/v1/auth/register", json={**account, "role": "admin"}).status_code == 422


def test_admin_creates_edits_archives_and_restores_without_losing_history(
    administrator, db, managed_catalog
):
    body = book_input(managed_catalog)
    created = administrator.post("/api/v1/admin/books", json=body)
    assert created.status_code == 201
    book_id = created.json()["id"]
    assert administrator.get(f"/api/v1/books/{book_id}").json()["title"] == body["title"]
    assert administrator.post("/api/v1/downloads", json={"book_id": book_id}).status_code == 201
    assert administrator.post("/api/v1/favorites", json={"book_id": book_id}).status_code == 201
    edited = {**body, "title": body["title"] + " revised", "author": "Revised author"}
    response = administrator.put(f"/api/v1/admin/books/{book_id}", json=edited)
    assert response.status_code == 200 and response.json()["id"] == book_id
    assert administrator.get("/api/v1/books", params={"q": edited["title"]}).json()["total"] == 1
    archived = administrator.post(f"/api/v1/admin/books/{book_id}/archive")
    assert archived.status_code == 200 and archived.json()["is_active"] is False
    assert administrator.get(f"/api/v1/books/{book_id}").status_code == 404
    assert administrator.get("/api/v1/books", params={"q": edited["title"]}).json()["total"] == 0
    history = administrator.get("/api/v1/downloads").json()
    assert history["items"][0]["book"]["id"] == book_id
    assert history["items"][0]["book"]["is_active"] is False
    assert history["allowance"]["used"] == 1
    assert administrator.get("/api/v1/favorites").json()["items"][0]["book"]["id"] == book_id
    filtered = administrator.get("/api/v1/admin/books", params={
        "q": "Revised author", "category": managed_catalog, "status": "archived", "limit": 1,
    }).json()
    assert filtered["total"] == 1 and filtered["items"][0]["id"] == book_id
    assert administrator.get("/api/v1/admin/books", params={
        "category": managed_catalog, "status": "active",
    }).json()["total"] == 0
    restored = administrator.post(f"/api/v1/admin/books/{book_id}/restore")
    assert restored.status_code == 200 and restored.json()["id"] == book_id
    assert restored.json()["is_active"] is True
    assert administrator.get(f"/api/v1/books/{book_id}").json()["author"] == edited["author"]
    db.expire_all()
    book = db.get(Book, uuid.UUID(book_id))
    assert book.is_managed_by_admin is True


def test_admin_duplicates_include_case_insensitive_title_author(administrator, managed_catalog):
    body = book_input(managed_catalog)
    created = administrator.post("/api/v1/admin/books", json=body)
    assert created.status_code == 201
    assert administrator.post("/api/v1/admin/books", json=body).status_code == 409
    assert administrator.post("/api/v1/admin/books", json={
        **body, "title": body["title"].upper(), "author": "  CATALOG TEST AUTHOR  ",
        "source_url": "https://example.com/another-admin-source",
    }).status_code == 409
    assert administrator.post("/api/v1/admin/books", json={
        **body, "title": "Different title",
    }).status_code == 409
    assert administrator.put(
        f"/api/v1/admin/books/{created.json()['id']}", json=body,
    ).status_code == 200


def test_different_administrators_cannot_create_the_same_book_concurrently(
    administrator, db, account, managed_catalog
):
    first = administrator.post("/api/v1/auth/login", json={
        "email": account["email"], "password": account["password"], "client": "android",
    }).json()["access_token"]
    with TestClient(app) as other:
        response = other.post("/api/v1/auth/register", json={
            **account, "email": "another-admin@example.com", "client": "android",
        })
    assert response.status_code == 201
    second_user = db.get(User, uuid.UUID(response.json()["user"]["id"]))
    second_user.role = "admin"
    db.commit()
    second = response.json()["access_token"]
    body = book_input(managed_catalog)
    variant = {**body, "title": body["title"].upper(), "source_url": body["source_url"] + "-other"}
    barrier = Barrier(2)

    def create(arguments):
        token, payload = arguments
        with TestClient(app) as worker:
            barrier.wait(timeout=10)
            return worker.post(
                "/api/v1/admin/books", json=payload,
                headers={"Authorization": f"Bearer {token}"},
            ).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(create, [(first, body), (second, variant)]))
    assert sorted(results) == [201, 409]
    assert db.scalar(select(func.count()).select_from(Book).where(Book.category == managed_catalog)) == 1


@pytest.mark.parametrize("changes", [
    {"title": " "}, {"author": ""}, {"category": "x" * 81},
    {"source_url": "javascript:alert(1)"}, {"cover_url": "data:image/svg+xml,test"},
    {"source_url": "https://user:password@example.com/book"}, {"access_type": "unknown"},
    {"description": "x" * 10001}, {"is_active": False}, {"role": "admin"},
])
def test_admin_book_input_validation(administrator, managed_catalog, changes):
    assert administrator.post(
        "/api/v1/admin/books", json=book_input(managed_catalog, **changes),
    ).status_code == 422


def test_admin_overview_uses_database_counts_and_real_activity(administrator, db, managed_catalog):
    body = book_input(managed_catalog)
    result = administrator.post("/api/v1/admin/books", json=body)
    assert result.status_code == 201
    book_id = result.json()["id"]
    administrator.post("/api/v1/downloads", json={"book_id": book_id})
    administrator.post(f"/api/v1/admin/books/{book_id}/archive")
    response = administrator.get("/api/v1/admin/overview")
    assert response.status_code == 200
    summary = response.json()
    assert summary["total_books"] == db.scalar(select(func.count()).select_from(Book))
    assert summary["active_books"] == db.scalar(
        select(func.count()).select_from(Book).where(Book.is_active.is_(True))
    )
    assert summary["archived_books"] == summary["total_books"] - summary["active_books"]
    assert summary["registered_users"] == db.scalar(select(func.count()).select_from(User)) == 1
    assert summary["total_downloads"] == db.scalar(select(func.count()).select_from(Download)) == 1
    assert summary["recent_downloads"][0]["book"]["id"] == book_id
    assert summary["recent_downloads"][0]["owner_type"] == "registered"
    assert summary["recent_downloads"][0]["event_type"] == "tracking_demo"
    assert any(row["id"] == book_id for row in summary["recent_books"])
    assert {row["name"]: row["count"] for row in summary["categories"]}[managed_catalog] == 1
    serialized = response.text.lower()
    assert "password_hash" not in serialized and "session_token" not in serialized


def test_admin_unknown_book_and_pagination_validation(administrator, managed_catalog):
    unknown = uuid.uuid4()
    assert administrator.put(
        f"/api/v1/admin/books/{unknown}", json=book_input(managed_catalog),
    ).status_code == 404
    assert administrator.post(f"/api/v1/admin/books/{unknown}/archive").status_code == 404
    assert administrator.post(f"/api/v1/admin/books/{unknown}/restore").status_code == 404
    assert administrator.get("/api/v1/admin/books?status=deleted").status_code == 422
    assert administrator.get("/api/v1/admin/books?limit=51").status_code == 422


def test_bootstrap_seed_preserves_administrator_edits_and_archive(administrator, db, managed_catalog):
    original = db.scalar(select(Book).where(Book.is_active.is_(True), Book.is_managed_by_admin.is_(False)))
    assert original is not None
    fields = {
        key: getattr(original, key) for key in [
            "title", "author", "category", "description", "cover_url", "source_url", "license_type",
            "access_type", "is_active", "is_managed_by_admin", "seed_source_url",
        ]
    }
    book_id = str(original.id)
    try:
        body = book_input(managed_catalog, title=original.title + " administrator revision")
        response = administrator.put(f"/api/v1/admin/books/{book_id}", json=body)
        assert response.status_code == 200
        assert administrator.post(f"/api/v1/admin/books/{book_id}/archive").status_code == 200
        seed_catalog(db)
        db.refresh(original)
        assert original.title == body["title"] and original.source_url == body["source_url"]
        assert original.is_active is False and original.is_managed_by_admin is True
        assert db.scalar(select(func.count()).select_from(Book).where(
            Book.seed_source_url == fields["seed_source_url"],
        )) == 1
    finally:
        db.rollback()
        restored = db.get(Book, uuid.UUID(book_id))
        for key, value in fields.items():
            setattr(restored, key, value)
        db.commit()
