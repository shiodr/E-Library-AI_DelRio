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
    assert catalog["total"] == 8
    assert all(book["license_type"].startswith("Public domain in the USA") for book in catalog["items"])
    book = catalog["items"][0]
    assert client.get(f"/api/v1/books/{book['id']}").json() == book


def test_search_filter_pagination_and_bounds(client):
    result = client.get("/api/v1/books", params={"q": "darwin"}).json()
    assert result["total"] == 1
    assert result["items"][0]["author"] == "Charles Darwin"
    page = client.get("/api/v1/books", params={"category": "Literature", "limit": 1, "offset": 1}).json()
    assert page["total"] == 3 and len(page["items"]) == 1
    assert client.get("/api/v1/books?limit=51").status_code == 422
    assert client.get("/api/v1/books?offset=-1").status_code == 422
    assert client.get("/api/v1/books?q=%25").json()["total"] == 0
    assert client.get("/api/v1/books/00000000-0000-0000-0000-000000000000").status_code == 404


def test_category_counts(client):
    categories = client.get("/api/v1/categories").json()
    assert sum(item["count"] for item in categories) == 8
    assert len(categories) == 4
