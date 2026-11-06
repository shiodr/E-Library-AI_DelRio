# Wasmer deployment — shared FastAPI backend

The existing frontend is `https://elibrary-ai.wasmer.app`. Deploy this backend as
a separate Wasmer application, for example `elibrary-ai-api`. React and Android
then use its public HTTPS `/api/v1` URL. No frontend redesign is required.

## Verified locally on November 2, 2026

Wasmer CLI 7.5.0 ran the packaged backend, connected to PostgreSQL, verified Argon2id,
and served real HTTP authentication, favorites, and quota requests. The earlier
native-wheel blocker is resolved with a separate WASIX lock: Pydantic 2.13.4+wasix.2,
core 2.46.4+wasix.3, Argon2 bindings 25.1.0+wasix.2, and CFFI 2.1.0+wasix.3.
The normal macOS/Windows/Linux dependency lock remains unchanged.

Argon2id retains 64 MiB and three passes, with one lane for WebAssembly. Existing
four-lane hashes also verified in this runtime. The manifest pins runtime package
`python/python@=3.13.19`; its executable reports CPython 3.13.15. The diagnostic
reports actual versions without printing credentials.

On November 3, 2026, the packaged migration, idempotent eight-book seed, and runtime
check succeeded against the user-created Wasmer-managed PostgreSQL database. The
runtime confirmed PostgreSQL connectivity, Argon2id, and migration revision `0001`.
The dotenv CORS JSON requires outer single quotes, and Alembic uses the same TLS
settings as the API. Eleven focused configuration/migration regression tests passed.

The backend was deployed on November 3, 2026 at
`https://backend-shiodr.wasmer.app`. Public checks returned HTTP 200 for `/`,
`/health`, `/docs`, and `/api/v1/books`; unknown paths still return 404. Root service
information supports Wasmer's deployment check while `/health` verifies PostgreSQL.
Browser cookie behavior at the final deployed frontend/API origins remains to be checked.

## 1. Configure production PostgreSQL and backend secrets

Choose Wasmer-managed PostgreSQL or an external provider. The commands below assume
a database address reachable from your terminal. An external TLS-enabled PostgreSQL
endpoint works for this flow. Never use SQLite or an ephemeral Edge filesystem DB.

From the monorepo root, copy the template only if the destination does not exist:

```bash
cp backend/.env.production.example backend/.env.production
backend/.venv/bin/python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Put the generated value in `SESSION_TOKEN_SECRET`. Populate the remaining settings:

```dotenv
APP_ENV=production
DATABASE_URL=postgresql+pg8000://USERNAME:PASSWORD@DATABASE_HOST:5432/DATABASE
DB_SSL=true
DB_SSL_VERIFY=true
SESSION_TOKEN_SECRET=YOUR_RANDOM_GENERATED_VALUE
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=none
CORS_ORIGINS='["https://elibrary-ai.wasmer.app","https://localhost","capacitor://localhost"]'
```

Keep the outer single quotes around `CORS_ORIGINS` in dotenv files. Wasmer's
`--env-file` parser otherwise strips the JSON double quotes, causing a
`cors_origins` settings error before the application can connect to PostgreSQL.

URL-encode reserved characters in database usernames/passwords, or use the separate
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD` variables instead.
All backend instances must share the same secret. Keep it out of `VITE_*`.

For Wasmer-managed PostgreSQL, remove `DATABASE_URL` and use its injected `DB_*`
variables at runtime. For local migration commands, put the dashboard's current
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD` in the ignored
production environment file. After credential rotation, copy the updated values.
Do not paste passwords into chat, source code, or shell command arguments.

Wasmer uses a private certificate authority and documents encrypted connections
without public certificate-chain verification. Set **both** `DB_SSL=true` and
`DB_SSL_VERIFY=false` for that service. This keeps encryption but does not authenticate
the server certificate; prefer a provider CA certificate when one is available.
Other PostgreSQL providers retain `DB_SSL_VERIFY=true`, the default.
See [Wasmer database TLS and connection variables](https://docs.wasmer.io/edge/learn/databases/).

`SameSite=None` alone does not bypass third-party-cookie blocking. The API now adds
`Partitioned` automatically when `SESSION_COOKIE_SECURE=true` and
`SESSION_COOKIE_SAMESITE=none`. The HttpOnly session cookie is scoped to the API host
and the frontend's top-level site, so supporting browsers can retain it with ordinary
third-party cookies blocked. Login retires the legacy unpartitioned cookie; logout
clears both cookie stores and revokes the server session. No token enters Web Storage.
See [CHIPS browser support and behavior](https://privacysandbox.google.com/cookies/chips).
Older browsers without partitioned-cookie support still require a same-site custom
domain or same-origin API proxy. Android bearer sessions do not rely on browser cookies. Add the
API's own exact HTTPS origin to CORS if using authenticated mutations through `/docs`.

## 2. Build locally for WASIX

Install Python dependencies as described in [backend setup](../backend/README.md).
Install Wasmer and log into your account:

```bash
brew install wasmer
wasmer login
```

For Windows/Linux, use the official Wasmer installer. From the monorepo root:

```bash
backend/.venv/bin/python backend/scripts/build_wasmer.py
wasmer package build --check backend
```

Windows replaces the interpreter path with `backend\.venv\Scripts\python.exe`.
The script installs binary-only wheels into ignored `backend/.wasmer-build` and
copies only application/migration source and entry points. Local databases, frontend,
environment files, and virtual environments are excluded. No Node/npm build is needed.

`backend/wasmer.toml` defines `serve` (default), `migrate`, `seed`, and `check` commands.
The package is intentionally unnamed; Wasmer supports unnamed packages, so no package
namespace edit is required.

## 3. Apply migrations and seed the production database

Run the packaged commands using the ignored production environment file:

```bash
wasmer run backend --entrypoint migrate --net --env-file backend/.env.production
wasmer run backend --entrypoint seed --net --env-file backend/.env.production
wasmer run backend --entrypoint check --net --env-file backend/.env.production
```

`migrate` applies Alembic `upgrade head`. `seed` upserts the 200 reviewed programming
records and archives the eight legacy samples without deleting history. `check`
verifies imports, hashing, PostgreSQL, and the migration revision.
The server does not migrate automatically on each Edge cold start. Never run test
rollback commands against production.

For an existing pre-catalog deployment, apply additive migration `0002`, deploy the
matching backend and frontend access labels, then run the seed as the final atomic
catalog switch. The expanded columns remain compatible with the previous backend
during rollout. See [catalog sources and preservation](programming-catalog.md).

For Wasmer-managed PostgreSQL, `capabilities.database.engine: postgres` provisions it
and injects `DB_*` credentials. Remove the placeholder `DATABASE_URL` so those values
take effect. Configure TLS according to the provider. Private managed addresses need
a trusted migration environment with network access; use the platform access available
for your plan or an externally reachable PostgreSQL endpoint. Local Wasmer is not
assumed to resolve private cloud DNS. Do not assume a paid SSH feature is available.

## 4. Deploy the API as a separate application

```bash
cp backend/app.yaml.example backend/app.yaml
```

Set `owner` to your Wasmer username and select a unique API application `name`.
Do not copy the frontend's existing `app_id`. For external PostgreSQL, remove the
`capabilities.database` block to avoid provisioning an unused managed database.

Change into the backend directory before deploying:

```bash
cd backend
wasmer deploy --env-file .env.production
```

Use the local package flow. Do not select Node Static or send the entire monorepo
to an automatic framework detector. `--env-file` supplies runtime settings; the secret
file is not mounted inside the published package. Follow any package publication
prompts. Wasmer returns the actual backend HTTPS URL.

```bash
curl --fail https://YOUR_API_HOST/health
curl --fail https://YOUR_API_HOST/api/v1/books
```

The root `/` returns HTTP 200 with service information for deployment checks.
`/health` queries PostgreSQL. `/docs` exposes the API schema. For an explicit HTTP test
that creates a uniquely named account and guest records:

```bash
.venv/bin/python scripts/smoke_api.py --url https://YOUR_API_HOST
```

Verify real website cookies, native bearer access, guest limits, and logout at the
final deployed host before handover.

## 5. Connect the existing frontend and Android

Set `apps/web/.env.production`:

```dotenv
VITE_API_BASE_URL=https://YOUR_API_HOST/api/v1
```

Rebuild and redeploy the existing website from the monorepo root (run `cd ..`
first if your terminal is still inside `backend`):

```bash
npm run build
wasmer deploy --dir apps/web
```

Synchronize Android with `npm run android:sync`, using the same environment. Vite bakes
the API URL into assets; changing hosting environment values after compilation does
not rewrite an existing bundle. Database passwords and authentication secrets never
belong in this public URL or any other frontend variable.

## Maintenance and verification limits

Rebuild the WASIX package after backend source changes. Test schema changes on a
separate `_test` database and back up production before migrations. Keep secure cookies
and restricted origins enabled; add deployment rate limits/monitoring before an
unrestricted public rollout. Tracking/quota endpoints are implemented; file streaming
and the frontend's future library buttons remain separate work.

The Dockerfile targets a conventional Python container host. This Wasmer workflow
uses the WASIX manifest, not a native Docker container. Docker was unavailable locally;
no Docker build or production cloud deployment is claimed.

## Official references checked November 2, 2026

- [Manifest and unnamed packages](https://docs.wasmer.io/registry/manifest/)
- [Deployment CLI](https://docs.wasmer.io/edge/cli/)
- [Application/database configuration](https://docs.wasmer.io/edge/configuration/)
- [Python frameworks and database environment variables](https://docs.wasmer.io/edge/learn/supported-frameworks-and-languages/)
- [WASIX Python wheels](https://www.wasix.org/docs/language-guide/python/installation/)
