import hashlib
import hmac
import ssl

import pytest
from pydantic import SecretStr, ValidationError

from app.core.config import Settings, get_settings
from app.core.database import database_connect_args
from app.services.auth import token_hash


def production_settings(**overrides):
    return Settings(
        database_url="postgresql+pg8000://test@localhost/test",
        app_env="production",
        session_cookie_secure=True,
        cors_origins=["https://elibrary-ai.wasmer.app", "https://localhost"],
        **overrides,
    )


def test_production_requires_secure_random_session_secret():
    with pytest.raises(ValidationError, match="SESSION_TOKEN_SECRET"):
        production_settings(session_token_secret=None)
    with pytest.raises(ValidationError, match="32 random characters"):
        production_settings(session_token_secret="short")
    assert (
        production_settings(session_token_secret="test-only-production-shaped-secret-123456").app_env
        == "production"
    )


def test_session_token_digest_uses_environment_secret(monkeypatch):
    secret = "test-only-hmac-secret-with-more-than-32-characters"
    monkeypatch.setattr(get_settings(), "session_token_secret", SecretStr(secret))
    token = "v1.test-token"
    assert token_hash(token) == hmac.new(secret.encode(), token.encode(), hashlib.sha256).hexdigest()
    assert secret not in repr(get_settings().session_token_secret)


def test_production_still_rejects_wildcard_origins():
    with pytest.raises(ValidationError, match="explicit trusted origins") as failure:
        Settings(database_url="postgresql+pg8000://test:sensitive-test-password@localhost/test", cors_origins=["*"])
    assert "sensitive-test-password" not in str(failure.value)


@pytest.mark.parametrize("tls,verify", [(False, True), (True, True), (True, False)])
def test_database_tls_modes(tls, verify):
    settings = Settings(
        database_url="postgresql+pg8000://test@localhost/test",
        db_ssl=tls,
        db_ssl_verify=verify,
    )
    arguments = database_connect_args(settings)
    if not tls:
        assert arguments == {}
        return
    context = arguments["ssl_context"]
    assert isinstance(context, ssl.SSLContext)
    assert context.verify_mode == (ssl.CERT_REQUIRED if verify else ssl.CERT_NONE)
    assert context.check_hostname is verify


def test_database_tls_verification_defaults_on():
    settings = Settings(database_url="postgresql+pg8000://test@localhost/test", db_ssl=True)
    assert settings.db_ssl_verify is True
    assert database_connect_args(settings)["ssl_context"].verify_mode == ssl.CERT_REQUIRED


def test_private_ca_mode_requires_tls():
    with pytest.raises(ValidationError, match="DB_SSL"):
        Settings(
            database_url="postgresql+pg8000://test@localhost/test",
            db_ssl=False,
            db_ssl_verify=False,
        )
