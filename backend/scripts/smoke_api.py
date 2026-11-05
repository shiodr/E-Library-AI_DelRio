"""Exercise a running API with real requests. Creates a uniquely named smoke-test account."""

import argparse
import secrets
import uuid

import httpx


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="API host, without /api/v1")
    args = parser.parse_args()
    host = args.url.rstrip("/")
    base = f"{host}/api/v1"
    with httpx.Client(headers={"Origin": "https://elibrary-ai.wasmer.app"}, timeout=30) as web:
        assert web.get(f"{host}/health").status_code == 200
        books = []
        offset = 0
        while len(books) < 6:
            page = web.get(f"{base}/books", params={"limit": 50, "offset": offset}).json()
            books.extend(book for book in page["items"] if book.get("access_type", "free_to_read") == "free_to_read")
            offset += 50
            if offset >= page["total"]:
                break
        assert len(books) >= 6, "Seed at least six books before running the quota smoke check."
        with httpx.Client(timeout=30) as mobile:
            guest = mobile.post(f"{base}/auth/guest", json={"client": "android"})
            assert guest.status_code == 201
            mobile.headers["Authorization"] = f"Bearer {guest.json()['access_token']}"
            for book in books[:5]:
                assert mobile.post(f"{base}/downloads", json={"book_id": book["id"]}).status_code == 201
            assert mobile.post(f"{base}/downloads", json={"book_id": books[5]["id"]}).status_code == 403
            assert mobile.post(f"{base}/downloads", json={"book_id": books[0]["id"]}).status_code == 200
            assert mobile.post(f"{base}/auth/logout").status_code == 204
            assert mobile.get(f"{base}/auth/me").status_code == 401

            email = f"smoke-{uuid.uuid4().hex}@example.com"
            password = secrets.token_urlsafe(24)
            registration = web.post(
                f"{base}/auth/register",
                json={
                    "full_name": "API smoke check",
                    "email": email,
                    "password": password,
                    "client": "web",
                },
            )
            assert registration.status_code == 201
            identity = registration.json()["user"]["id"]
            mobile.headers.pop("Authorization")
            login = mobile.post(
                f"{base}/auth/login", json={"email": email, "password": password, "client": "android"}
            )
            assert login.status_code == 200 and login.json()["user"]["id"] == identity
            mobile.headers["Authorization"] = f"Bearer {login.json()['access_token']}"
            assert mobile.get(f"{base}/auth/me").json()["user"]["id"] == identity
            action = {"book_id": books[0]["id"]}
            assert mobile.post(f"{base}/favorites", json=action).status_code == 201
            assert mobile.get(f"{base}/favorites").json()["total"] == 1
            assert web.get(f"{base}/favorites").json()["total"] == 1
            assert mobile.delete(f"{base}/favorites/{books[0]['id']}").status_code == 204
            assert mobile.post(f"{base}/downloads", json=action).status_code == 201
            assert web.get(f"{base}/downloads").json()["allowance"]["used"] == 1
            assert mobile.post(f"{base}/auth/logout").status_code == 204
            assert mobile.get(f"{base}/auth/me").status_code == 401
        assert web.get(f"{base}/auth/me").status_code == 200
        assert web.post(f"{base}/auth/logout").status_code == 204
        assert web.get(f"{base}/auth/me").status_code == 401
    print(
        "PASS: health, real catalog, guest 5-book limit, repeat download, web/Android shared account, favorites, tracking, logout."
    )


if __name__ == "__main__":
    main()
