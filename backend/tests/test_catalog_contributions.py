from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from test_admin import book_input

from app.main import app
from app.models import Book
from app.models.entities import BookPrice
from app.services.offer_seed import seed_prices

ORIGIN = {"Origin": "http://localhost:5173"}
API = "/api/v1"


def offer(source, amount="19.99", currency="USD"):
    payload = {
        "source_amount": amount,
        "currency": currency,
        "offer_format": "Ebook",
        "source_url": source,
        "checked_on": date(2026, 11, 24).isoformat(),
    }
    if currency != "PHP":
        payload.update(rate_php_per_unit="63.863", rate_date="2026-11-24")
    return payload


def test_price_authorization_filters_and_pagination(administrator, managed_catalog):
    def add(suffix, access):
        body = book_input(managed_catalog, title=f"Price fixture {suffix}", access_type=access)
        response = administrator.post(API + "/admin/books", json=body)
        assert response.status_code == 201
        return response.json()

    cheap, costly, unknown, free = (
        add(name, access) for name, access in [("Z", "paid"), ("A", "paid"), ("B", "paid"), ("C", "free_to_read")]
    )

    def edit(book, data):
        return administrator.put(f"{API}/admin/books/{book['id']}/price", json=data)

    assert edit(free, offer(free["source_url"])).status_code == 409
    body = offer(cheap["source_url"])
    path = f"{API}/admin/books/{cheap['id']}/price"
    with TestClient(app, headers=ORIGIN) as outsider:
        assert outsider.put(path, json=body).status_code == 401
        outsider.post(API + "/auth/guest", json={})
        assert outsider.put(path, json=body).status_code == 403

    assert edit(cheap, {**body, "rate_date": None}).status_code == 422
    price = edit(cheap, body).json()
    assert price["amount_php_minor"] == 127_662
    assert edit(costly, offer(costly["source_url"], "1800.50", "PHP")).json()["amount_php_minor"] == 180_050
    query = {"category": managed_catalog, "q": "Price fixture", "limit": 1, "access_type": "paid", "sort": "price_asc"}
    for offset, expected in enumerate([cheap, costly, unknown]):
        page = administrator.get(API + "/books", params={**query, "offset": offset}).json()
        assert page["total"] == 3
        assert page["items"][0]["id"] == expected["id"]
    free_page = administrator.get(API + "/books", params={"category": managed_catalog, "access_type": "free_to_read"}).json()
    assert [item["id"] for item in free_page["items"]] == [free["id"]]
    assert administrator.get(API + "/books", params={"access_type": "free_to_read", "sort": "price_asc"}).status_code == 422
    assert administrator.get(f"{API}/books/{cheap['id']}").json()["price"] == price
    assert administrator.delete(path).status_code == 204
    assert administrator.get(f"{API}/books/{cheap['id']}").json()["price"] is None


def submission(category, **changes):
    return {
        "kind": "tutorial",
        "title": "Author resource",
        "author": "The Creator",
        "category": category,
        "description": "An original learning resource.",
        "source_url": "https://example.com/resource/" + category.split()[-1],
        "access_type": "free_to_read",
        "proof_url": "https://example.com/private-proof",
        "rights_attested": True,
        **changes,
    }


def test_resource_submission_is_private_until_review(administrator, managed_catalog):
    listing = submission(managed_catalog)
    with TestClient(app, headers=ORIGIN) as author, TestClient(app, headers=ORIGIN) as other:
        assert author.post(API + "/submissions", json=listing).status_code == 401
        author.post(API + "/auth/guest", json={})
        assert author.post(API + "/submissions", json=listing).status_code == 403
        author.post(API + "/auth/register", json={"email": "creator@example.com", "password": "creator-test-secret", "full_name": "Creator"})
        other.post(API + "/auth/register", json={"email": "other@example.com", "password": "another-test-secret", "full_name": "Other"})
        assert author.post(API + "/submissions", json={**listing, "rights_attested": False}).status_code == 422
        assert author.post(API + "/submissions", json={**listing, "proof_url": "data:text/html,test"}).status_code == 422
        created = author.post(API + "/submissions", json=listing)
        assert created.status_code == 201
        assert created.json()["status"] == "pending" and "proof_url" not in created.json()
        path = f"{API}/admin/submissions/{created.json()['id']}/review"
        assert author.post(path, json={"action": "approve"}).status_code == 403
        assert other.get(API + "/submissions").json()["total"] == 0
        assert author.get(API + "/resources", params={"category": managed_catalog}).json()["total"] == 0
        queue = administrator.get(API + "/admin/submissions").json()
        assert queue["items"][0]["proof_url"] == listing["proof_url"]
        assert administrator.post(path, json={"action": "approve"}).status_code == 200
        public = author.get(API + "/resources", params={"category": managed_catalog, "kind": "tutorial", "q": "Author"}).json()
        assert public["total"] == 1 and public["items"][0]["source_url"] == listing["source_url"]
        assert not {"proof_url", "owner_id", "decline_reason", "status"} & public["items"][0].keys()
        assert author.get(API + "/resources", params={"category": managed_catalog, "kind": "course"}).json()["total"] == 0
        assert administrator.post(path, json={"action": "archive"}).status_code == 200
        assert author.get(API + "/resources", params={"category": managed_catalog}).json()["total"] == 0
        assert author.get(API + "/submissions").json()["items"][0]["status"] == "archived"
        rejected = author.post(API + "/submissions", json=listing).json()
        decline = f"{API}/admin/submissions/{rejected['id']}/review"
        assert administrator.post(decline, json={"action": "decline"}).status_code == 422
        assert administrator.post(decline, json={"action": "decline", "reason": "Please provide clearer permission."}).status_code == 200
        assert author.get(API + "/submissions").json()["items"][0]["decline_reason"] == "Please provide clearer permission."


def test_concurrent_approval_of_book_is_idempotent(administrator, account, db, managed_catalog):
    listing = submission(managed_catalog, kind="book", title=f"Book by an author {managed_catalog}")
    created = administrator.post(API + "/submissions", json=listing).json()
    path = f"{API}/admin/submissions/{created['id']}/review"
    barrier = Barrier(2)

    def approve(_):
        with TestClient(app) as worker:
            login = worker.post(API + "/auth/login", json={**{k: account[k] for k in ("email", "password")}, "client": "android"})
            token = login.json()["access_token"]
            barrier.wait(timeout=10)
            response = worker.post(path, json={"action": "approve"}, headers={"Authorization": f"Bearer {token}"})
            assert response.status_code == 200
            return response.json()["published_book_id"]

    with ThreadPoolExecutor(max_workers=2) as pool:
        first, second = pool.map(approve, range(2))
    assert first == second
    assert db.scalar(select(func.count()).select_from(Book).where(Book.category == managed_catalog)) == 1
    duplicate = administrator.post(API + "/submissions", json=listing).json()
    assert administrator.post(f"{API}/admin/submissions/{duplicate['id']}/review", json={"action": "approve"}).status_code == 409
    assert administrator.post(f"{API}/admin/books/{first}/archive").status_code == 200
    assert administrator.get(f"{API}/books/{first}").status_code == 404
    assert administrator.get(API + "/admin/submissions?status=archived").json()["items"][0]["published_book_id"] == first


def test_reviewed_price_seed_is_repeatable(db):
    try:
        first, paid = seed_prices(db)
        second, same_paid = seed_prices(db)
        assert 0 < first <= paid
        assert (first, paid) == (second, same_paid)
    finally:
        for price in db.scalars(select(BookPrice)):
            db.delete(price)
        db.commit()
