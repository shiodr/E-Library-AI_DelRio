import os
import subprocess
import sys

from app.core.config import Settings


def provision(tmp_path, email, action):
    config = tmp_path / "production.env"
    config.write_text("DATABASE_URL=" + os.environ["TEST_DATABASE_URL"] + "\nAPP_ENV=test\n")
    config.chmod(0o600)
    environment = {key: value for key, value in os.environ.items() if key not in {name.upper() for name in Settings.model_fields}}
    program = (
        "from app.core.config import Settings; "
        "Settings.model_config['env_file']='/nonexistent-elibrary-default.env'; "
        "from app.services.admin_access import main; main()"
    )
    return subprocess.run(
        [sys.executable, "-c", program, "--env-file", str(config), "--email", email, action],
        capture_output=True, text=True, env=environment, timeout=20, check=False,
    )


def test_trusted_cli_grants_and_revokes_without_default_env(client, account, tmp_path):
    assert client.post("/api/v1/auth/register", json=account).status_code == 201
    granted = provision(tmp_path, account["email"], "--grant")
    assert granted.returncode == 0
    assert client.get("/api/v1/auth/me").json()["user"]["role"] == "admin"
    revoked = provision(tmp_path, account["email"], "--revoke")
    assert revoked.returncode == 0
    assert client.get("/api/v1/auth/me").json()["user"]["role"] == "reader"


def test_trusted_cli_never_creates_public_admin_account(client, tmp_path):
    result = provision(tmp_path, "missing-admin@example.com", "--grant")
    assert result.returncode == 2
    assert "Account not found" in result.stderr
