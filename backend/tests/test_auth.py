from datetime import UTC, datetime, timedelta

from sqlalchemy import select

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
