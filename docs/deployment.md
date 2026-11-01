# Deployment preparation and Wasmer compatibility gate

No cloud app or database has been provisioned. No account credentials were assumed.
These configuration examples prepare a deployment; they are not a claim that this
exact backend has run in Wasmer's WASIX runtime.

## Current support and observed limitation

Official Wasmer documentation lists FastAPI/Uvicorn auto-detection, static React
hosting, PostgreSQL provisioning, and environment credentials. The official FastAPI
template uses `main:app`; `backend/main.py` exposes that entry point. The PostgreSQL
configuration explicitly uses `engine: postgres` because an omitted engine defaults
to MySQL. `config.py` supports an external `DATABASE_URL`, or Wasmer's injected
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD`.

An actual binary-only dependency resolution check was executed against the official
WASIX registry for Python 3.13:

```bash
backend/.venv/bin/python -m pip download -r backend/requirements.txt \
  --index-url https://python-registry.wasmer.app/all/simple/ \
  --platform wasix_wasm32 --python-version 3.13 --only-binary=:all: \
  --dest .local/wasix-wheels
```

It failed because `fastapi==0.162.0` is absent; the registry reported
`0.115.14+wasix.2` and `0.139.0+wasix.2`. This proves the current lock is not directly
deployable through that registry. It does not prove that simply changing FastAPI
resolves Pydantic core, Argon2 bindings, CFFI, and every transitive dependency.
Do not replace Argon2id with a weaker hash or skip its native import to force deployment.

A separate availability probe successfully downloaded WASIX Argon2 bindings
`25.1.0+wasix.2`, CFFI `2.1.0+wasix.3`, and their parser dependency. The local lock
uses Argon2 bindings `26.1.0`. This probe demonstrates that a supported Argon2 runtime
is plausible; it does not validate the entire application or its current lock.

The combined-index check was also executed by adding
`--extra-index-url https://pypi.org/simple/` to the command above. Pure Python FastAPI
resolved from PyPI, but the locked `pydantic-core==2.50.2` had no matching WASIX
distribution. That native dependency is a confirmed blocker even with both indexes.

Before backend deployment, obtain a supported, security-reviewed WASIX dependency
lock, rerun resolution, and test imports, Argon2id hash/verify, PostgreSQL TLS/connectivity,
health, and the full authentication suite inside that runtime. If this package set
cannot run there, use a standard Python HTTPS host for the shared FastAPI backend
and Wasmer for the frontend. The included Dockerfile is a portable fallback artifact;
it has not been built locally because Docker is absent. Wasmer is not assumed to run
this Dockerfile as a native Linux container.

## Static frontend procedure

1. Install Wasmer and log into your own account with `wasmer login`.
2. Set the reachable HTTPS API in `apps/web/.env.production`.
3. Run `npm ci` and `npm run build` from the monorepo root.
4. Copy `apps/web/app.yaml.example` to `apps/web/app.yaml`, fill in owner/app name,
   and set the package name in `wasmer.toml` to `YOUR_USERNAME/elibrary-ai-web`.
5. From `apps/web`, run `wasmer deploy` and follow its package-publish prompts.
6. Open the returned HTTPS URL and directly reload `/app/explore` to verify SPA fallback.

`wasmer.toml` follows the official React starter, mounts `dist` at `/public`, and
uses the static-web-server package. `SERVER_ROOT` and `SERVER_FALLBACK_PAGE` configure
React Router fallback. The account/CLI deployment and fallback behavior still need
runtime verification; no installed Wasmer CLI or cloud deployment was available here.

## Backend procedure after the compatibility gate passes

1. Import the `backend` directory into Wasmer using the FastAPI template or Git
   deployment flow; use `main:app` and Python 3.13. Keep `.env` out of the upload.
2. Generate the Python package/runtime configuration through the supported template;
   `backend/app.yaml.example` is application configuration, not a compiled Python package.
3. Fill in owner/name and retain the generated runtime/package reference. Enable its
   PostgreSQL capability, or configure an external PostgreSQL database with verified TLS.
4. Configure backend secrets through the Wasmer dashboard: database credentials,
   `APP_ENV=production`, `SESSION_COOKIE_SECURE=true`, and exact trusted CORS origins.
   For separate sites use `SESSION_COOKIE_SAMESITE=none`; prefer same-site custom domains.
5. Run `python -m alembic upgrade head` and `python -m app.services.seed` once against
   that production database from a trusted environment. Do not run test rollback there.
6. Deploy and check `/api/v1/health`, `/docs`, registration, guest creation, profile,
   logout/replay, and native bearer login over HTTPS.
7. Build both website and Android with that same final API URL. Verify web cookies
   under the actual browser privacy settings and complete the physical-device checklist.

Never store API secrets in `VITE_*` variables: those are public build inputs.
Do not bundle database credentials, keystores, local data directories, or `.env` files.
Production PostgreSQL is external or managed, never SQLite or an Edge filesystem database.
Use backups before schema changes. Public authentication also needs deployment-level
rate limiting and operational monitoring before unrestricted rollout.

## Official references checked November 1, 2026

- [Supported frameworks and database environment variables](https://docs.wasmer.io/edge/learn/supported-frameworks-and-languages/)
- [FastAPI starter and entry point](https://wasmer.io/templates/fastapi-starter)
- [Application configuration and PostgreSQL engine](https://docs.wasmer.io/edge/configuration/)
- [Managed databases](https://wasmer-docs.wasmer.app/edge/learn/databases/)
- [React static-site guide](https://docs.wasmer.io/edge/guides/react-static-site/)
- [Official React starter configuration](https://github.com/wasmerio/edge-react-starter)
- [WASIX Python wheel installation](https://www.wasix.org/docs/language-guide/python/installation/)
