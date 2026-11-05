"""Environment-neutral PostgreSQL TLS settings shared by the API and provisioning CLI."""

import ssl

from app.core.config import Settings


def database_connect_args(settings: Settings) -> dict[str, ssl.SSLContext]:
    if not settings.db_ssl:
        return {}
    context = ssl.create_default_context()
    if not settings.db_ssl_verify:
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
    return {"ssl_context": context}
