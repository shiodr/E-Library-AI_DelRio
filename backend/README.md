# E-Library AI backend

Phase 1 extensions now include protected administrator statistics/book management,
private assistant conversations, catalog-grounded OpenAI tools, and explicit tracking
demonstration responses. Apply migration `0003` before deploying this API. See the
[completion handoff](../docs/phase1-completion.md) for setup, endpoints, and verification.
AI generation is unverified until a server-side key is configured and a real call succeeds.

One FastAPI/PostgreSQL API for the existing React website at
`https://elibrary-ai.wasmer.app` and the Capacitor Android app. No frontend source
or layout change is required. The existing authentication/catalog contracts remain
compatible; new library actions share the same session validation and database.

The current catalog contains 200 programming titles, including 60 Rust books.
Free online editions and paid publisher listings have explicit `access_type` values.
Run migration `0002` before the seed. The importer keeps stable IDs and archives
the eight original sample rows without deleting favorites, downloads, or accounts.
See [catalog sources and import rules](../docs/programming-catalog.md).

## Local setup

From the monorepo root, on a fresh checkout:

```bash
cp .env.example .env
docker compose up -d --wait postgres
python3.13 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install -r backend/requirements-dev.txt
cp backend/.env.example backend/.env
```

Do not overwrite existing environment files. Match the PostgreSQL password in
root `.env` and `backend/.env`. Generate a random authentication secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Put that value in `SESSION_TOKEN_SECRET` in `backend/.env`. It is required in
production. Development can retain legacy random opaque tokens when unset.
All database credentials and authentication secrets stay in backend environment
variables. No `VITE_*` value may contain either.

Initialize and start the API:

```bash
cd backend
python -m alembic upgrade head
python -m app.services.seed
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Health: `http://127.0.0.1:8000/health` (also `/api/v1/health`). OpenAPI: `/docs`.
The API root `/` returns a small service description with links to `/docs` and
`/health`. Root HTTP 200 supports deployment checks; `/health` verifies PostgreSQL.

The existing local Homebrew cluster uses `127.0.0.1:55432`; its current ignored
`backend/.env` is already configured. A new Compose installation uses port 5432.
If this workspace reports a refused connection to port 55432, check whether the
cluster is stopped:

```bash
cd /Users/shio/Programming/E-Library-AI_DelRio
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D .local/postgres status
```

After a Mac restart, or whenever the status reports no server running, start the
existing cluster and rerun migration and seed:

```bash
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D .local/postgres -l .local/postgres.log -o '-p 55432 -h 127.0.0.1' start
cd backend
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m app.services.seed
```

Wait for each command to finish. Pressing Ctrl+C interrupts a migration; rerun
`alembic upgrade head` and let it complete before seeding or starting the API.

On Windows use `py -3.13 -m venv backend/.venv`, then
`.\backend\.venv\Scripts\Activate.ps1`; subsequent `python` commands are identical.

## Contracts

| Endpoint | Behavior |
| --- | --- |
| `POST /api/v1/auth/register` | Name/email/password and `client` (`web`/`android`); real account/session |
| `POST /api/v1/auth/login` | Email/password and client; browser cookie or native bearer token |
| `POST /api/v1/auth/guest` | Creates a separate database guest session |
| `GET /api/v1/auth/me` | Authenticated profile and current download allowance |
| `POST /api/v1/auth/logout` | Server-side revocation, cookie removal; 204 |
| `GET /api/v1/books`, `/books/{id}`, `/categories` | Existing real catalog/search/pagination |
| `GET /api/v1/favorites` | Registered user's saved favorites; paginated |
| `POST /api/v1/favorites` | `{ "book_id": "UUID" }`; 201 new, 200 existing |
| `DELETE /api/v1/favorites/{book_id}` | Remove only the caller's favorite; idempotent 204 |
| `GET /api/v1/downloads` | Caller-scoped history and `{limit,used,remaining}` allowance |
| `POST /api/v1/downloads` | `{ "book_id": "UUID" }`; record an authorized download request |

Library lists accept `limit` (1–50) and nonnegative `offset`. Guests cannot save
favorites. Private data never accepts a client-provided user/session owner ID.
Auth profile responses retain `planned_download_limit` for frontend compatibility
and add `download_limit`, `downloads_used`, and `downloads_remaining`.

Downloads consume **five distinct books per guest session** or **ten per registered
account across devices**, with no scheduled reset. Repeating a book returns 200
with `already_downloaded: true` and consumes no extra allowance. A sixth/eleventh
new book receives 403. Expired/revoked sessions receive 401. PostgreSQL owner-row
locks, session revalidation after lock waits, and unique constraints protect the
check-and-insert transaction against concurrent requests.

New requests for paid listings receive 403 without consuming an allowance. Public
catalog routes exclude archived rows; existing private history retains those rows.

This endpoint records approved requests; it does not claim that file bytes were
delivered. Source links remain external public catalog references. Controlled EPUB/PDF
storage, streaming, and delivery confirmation are separate future work. The shared
frontend now connects these endpoints through favorites, My Library history, and an
explicitly labeled tracking demonstration on free-book details. No file delivery is claimed.

## Authentication security

Argon2id uses 64 MiB, three passes, and one lane (compatible with WASIX). Existing
four-lane hashes still verify and are rehashed after successful login. Sessions use
random 256-bit tokens, absolute expiration, database revocation, and no browser token
storage. When `SESSION_TOKEN_SECRET` is configured, `v1.` tokens use HMAC-SHA256 digests.
Existing unprefixed SHA-256 session tokens remain valid until expiry/revocation.
Changing the secret invalidates HMAC sessions; revoke legacy sessions separately if
rotating in response to an incident. All instances must share the same secret.
Rolling back to the earlier SHA-only backend requires HMAC sessions to sign in again;
existing unprefixed sessions remain compatible.

Browser cookies are HttpOnly; production requires Secure. A separate HTTPS API uses
`SESSION_COOKIE_SAMESITE=none`. Android restores its bearer token from Android
Keystore-encrypted private storage before validating the session with the backend.
Logout, expiry, or revocation clears that saved credential. CORS permits the exact deployed website and documented
local/Capacitor origins; untrusted mutation origins are rejected independently of CORS.
Use the production environment template to exclude development origins.

## Tests

Create a dedicated test database once, from the monorepo root:

```bash
docker compose exec postgres sh -c 'createdb -U "$POSTGRES_USER" elibrary_test'
```

Then from `backend` with the virtual environment active:

```bash
export TEST_DATABASE_URL='postgresql+pg8000://elibrary:change-this-local-password@127.0.0.1:5432/elibrary_test'
python -m pytest -q
```

Use port 55432 without the example password for this workspace's existing isolated
Homebrew test cluster. Tests reject a database name without `_test` and exercise
migration rollback only there. PowerShell uses `$env:TEST_DATABASE_URL='...'`.

With a running API, the HTTP smoke test creates one uniquely named test account
and verifies actual web-cookie and Android-bearer requests, quotas, and favorites:

```bash
python scripts/smoke_api.py --url http://127.0.0.1:8000
```

## Container

From the monorepo root:

```bash
docker build -t elibrary-ai-api backend
docker run --rm -p 8000:8000 --env-file backend/.env.production elibrary-ai-api
```

Configure a reachable PostgreSQL host in the environment; container `localhost`
does not refer to the host machine. `PORT` defaults to 8000; the container health
check requests `/health`. The container runs as an unprivileged user. Docker was
not available locally, so this container recipe is supplied without a build claim.

## Wasmer

Use [deployment.md](../docs/deployment.md). The isolated `requirements-wasmer.txt`
and `constraints-wasmer.txt` select native WASIX wheels without changing the working
native-Python lock. Build locally and deploy the backend package from `backend/`;
the frontend's Node/static pipeline is a different deployment.

After the API is live, put its final HTTPS URL in `apps/web/.env.production`:

```env
VITE_API_BASE_URL=https://YOUR_API_HOST/api/v1
```

Rebuild/redeploy the existing frontend and run Capacitor sync for Android. Vite bakes
this public URL into the bundle; changing only the hosting environment after a build
does not change an already deployed bundle. The same API/database serves both clients.
