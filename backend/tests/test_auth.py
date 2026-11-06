from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.models import Session, User


def test_registration_and_profile(client, db, account):
    response = client.post("/api/v1/auth/register", json=account)
    assert response.status_code == 201
    assert response.json()["user"]["email"] == account["email"]
    assert response.json()["access_token"] is None
    assert "HttpOnly" in response.headers["set-cookie"]
    assert response.headers["cache-control"] == "no-store"
    user = db.scalar(select(User))
    assert user.password_hash.startswith("$argon2id$")
    assert account["password"] not in user.password_hash
    raw_token = client.cookies.get("elibrary_session")
    session = db.scalar(select(Session))
    assert session.session_token_hash != raw_token
    assert len(session.session_token_hash) == 64
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["id"] == str(user.id)
    assert me.json()["planned_download_limit"] == 10


@pytest.mark.parametrize("operation", ["guest", "register", "login"])
def test_cross_site_web_sessions_use_partitioned_secure_cookie(client, account, monkeypatch, operation):
    if operation == "login":
        assert client.post("/api/v1/auth/register", json=account).status_code == 201
    client.cookies.clear()
    client.base_url = "https://testserver"
    monkeypatch.setattr(get_settings(), "session_cookie_secure", True)
    monkeypatch.setattr(get_settings(), "session_cookie_samesite", "none")
    data = {} if operation == "guest" else account if operation == "register" else {
        "email": account["email"], "password": account["password"]
    }
    response = client.post(f"/api/v1/auth/{operation}", json=data)
    assert response.status_code in (200, 201)
    cookies = response.headers.get_list("set-cookie")
    assert len(cookies) == 2
    assert "Max-Age=0" in cookies[0] and "Partitioned" not in cookies[0]
    assert all(flag in cookies[1] for flag in ["Secure", "HttpOnly", "SameSite=none", "Path=/api/v1", "Partitioned"])
    assert "Domain=" not in cookies[1]
    assert response.json()["access_token"] is None
    assert client.get("/api/v1/auth/me").status_code == 200
    token = client.cookies.get("elibrary_session")
    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 204
    cleared = logout.headers.get_list("set-cookie")
    assert len(cleared) == 2
    assert all("Max-Age=0" in header for header in cleared)
    assert "Partitioned" in cleared[0] and "Partitioned" not in cleared[1]
    assert not client.cookies.get("elibrary_session")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_local_cookie_remains_compatible_and_android_never_requires_cookies(client):
    web = client.post("/api/v1/auth/guest", json={})
    assert "Partitioned" not in web.headers["set-cookie"]
    client.cookies.clear()
    android = client.post("/api/v1/auth/guest", json={"client": "android"})
    assert "set-cookie" not in android.headers
    assert android.json()["access_token"]


def test_duplicate_registration_case_insensitive(client, account):
    assert client.post("/api/v1/auth/register", json=account).status_code == 201
    account["email"] = account["email"].upper()
    assert client.post("/api/v1/auth/register", json=account).status_code == 409


def test_invalid_login_generic(client, account):
    assert client.post("/api/v1/auth/register", json=account).status_code == 201
    wrong = client.post("/api/v1/auth/login", json={"email": account["email"], "password": "wrong"})
    missing = client.post("/api/v1/auth/login", json={"email": "missing@example.com", "password": "wrong"})
    assert wrong.status_code == missing.status_code == 401
    assert wrong.json() == missing.json()


def test_web_account_logs_in_as_android(client, account):
    web = client.post("/api/v1/auth/register", json=account).json()
    client.cookies.clear()
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": account["email"],
            "password": account["password"],
            "client": "android",
        },
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    assert len(token) >= 43
    assert "set-cookie" not in login.headers
    headers = {"Authorization": f"Bearer {token}"}
    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["user"]["id"] == web["user"]["id"]
    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_guest_is_separate_and_revoked_on_registration(client, db, account):
    response = client.post("/api/v1/auth/guest", json={})
    assert response.status_code == 201
    assert response.json()["session_type"] == "guest"
    assert response.json()["user"] is None
    assert response.json()["planned_download_limit"] == 5
    assert db.scalar(select(User)) is None
    guest_token = client.cookies.get("elibrary_session")
    assert client.get("/api/v1/auth/me").status_code == 200
    assert client.post("/api/v1/auth/register", json=account).status_code == 201
    assert (
        client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {guest_token}"}).status_code == 401
    )


def test_unauthenticated_protected_request(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.post("/api/v1/auth/logout", json={}).status_code == 401


def test_logout_invalidates_stolen_token(client, account):
    client.post("/api/v1/auth/register", json=account)
    token = client.cookies.get("elibrary_session")
    assert client.post("/api/v1/auth/logout").status_code == 204
    assert not client.cookies.get("elibrary_session")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_expired_session_rejected(client, db):
    client.post("/api/v1/auth/guest", json={})
    session = db.scalar(select(Session))
    session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    assert client.get("/api/v1/auth/me").status_code == 401


def test_validation_and_untrusted_origin(client, account):
    weak = {**account, "password": "short"}
    assert client.post("/api/v1/auth/register", json=weak).status_code == 422
    assert client.post("/api/v1/auth/register", json={**account, "role": "admin"}).status_code == 422
    assert (
        client.post("/api/v1/auth/guest", json={}, headers={"Origin": "https://evil.example"}).status_code
        == 403
    )
    assert (
        client.get("/api/v1/health", headers={"Origin": "https://evil.example"}).headers.get(
            "access-control-allow-origin"
        )
        is None
    )


def test_cookie_mutation_requires_origin(client):
    client.post("/api/v1/auth/guest", json={})
    client.headers.pop("Origin")
    assert client.post("/api/v1/auth/logout").status_code == 403


def test_invalid_bearer_never_falls_back_to_cookie(client):
    client.post("/api/v1/auth/guest", json={})
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_login_upgrades_old_password_hash_without_changing_identity(client, db, account):
    from argon2 import PasswordHasher

    from app.services.auth import hasher

    identity = client.post("/api/v1/auth/register", json=account).json()["user"]["id"]
    user = db.scalar(select(User))
    user.password_hash = PasswordHasher(time_cost=1).hash(account["password"])
    db.commit()
    result = client.post(
        "/api/v1/auth/login", json={"email": account["email"], "password": account["password"]}
    )
    assert result.status_code == 200 and result.json()["user"]["id"] == identity
    db.refresh(user)
    assert not hasher.check_needs_rehash(user.password_hash)
