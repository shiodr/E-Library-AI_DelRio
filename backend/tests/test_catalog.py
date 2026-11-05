from collections import Counter

from app.services.catalog import load_catalog


def test_root_supports_deployment_checks_without_catching_unknown_routes(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "service": "E-Library AI API",
        "health": "/health",
        "docs": "/docs",
    }
    health = client.get(response.json()["health"])
    assert health.status_code == 200
    assert health.json()["database"] == "postgresql"
    assert client.get("/unknown-route").status_code == 404


def test_health_and_real_catalog(client):
    assert client.get("/api/v1/health").json()["database"] == "postgresql"
    catalog = client.get("/api/v1/books").json()
    assert catalog["total"] == 200
    assert all(book["category"] == "Rust" for book in catalog["items"])
    assert all(book["access_type"] in {"free_to_read", "paid"} for book in catalog["items"])
    book = catalog["items"][0]
    assert client.get(f"/api/v1/books/{book['id']}").json() == book


def test_search_filter_pagination_and_bounds(client):
    expected = next(book for book in load_catalog() if book.title == "The Rust Programming Language")
    result = client.get("/api/v1/books", params={"q": expected.title}).json()
    assert any(book["title"] == expected.title for book in result["items"])
    page = client.get("/api/v1/books", params={"category": "Rust", "limit": 1, "offset": 1}).json()
    assert page["total"] > 25 and len(page["items"]) == 1
    assert client.get("/api/v1/books?limit=51").status_code == 422
    assert client.get("/api/v1/books?offset=-1").status_code == 422
    expected_percent = sum("%" in f"{book.title} {book.author} {book.description}" for book in load_catalog())
    assert client.get("/api/v1/books?q=%25").json()["total"] == expected_percent
    assert client.get("/api/v1/books/00000000-0000-0000-0000-000000000000").status_code == 404


def test_category_counts(client):
    categories = client.get("/api/v1/categories").json()
    assert sum(item["count"] for item in categories) == 200
    assert {item["name"]: item["count"] for item in categories} == Counter(book.category for book in load_catalog())
    assert categories[0]["name"] == "Rust"


def test_all_two_hundred_books_are_reachable_without_duplicate_pages(client):
    identifiers = []
    for offset in range(0, 200, 50):
        page = client.get("/api/v1/books", params={"limit": 50, "offset": offset}).json()
        assert page["total"] == 200 and len(page["items"]) == 50
        identifiers.extend(book["id"] for book in page["items"])
    assert len(set(identifiers)) == 200
    assert client.get("/api/v1/books?offset=200").json()["items"] == []
