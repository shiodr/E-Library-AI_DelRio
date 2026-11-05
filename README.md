# E-Library AI

Created by **shio del rio**. Website and Android branding: **E-Library AI by shio del rio**.

Integrated Web and Android E-Library System with an Embedded Agentic AI Assistant.
IPT102 — Integrative Programming and Emerging Technologies 2.

Phase 1 provides a working React application, a generated Capacitor Android project,
and one FastAPI/PostgreSQL backend. Authentication and the 200-title programming catalog
use the real database. Rust is the largest category with 60 books; 34 online editions
are free to read and 166 entries link to paid publishers. The backend supports saved favorites and download tracking
with enforced five-book guest and ten-book account limits. My Library and favorites
are connected to the shared backend. Website administrators can add, edit, archive,
and restore books. The embedded assistant retrieves real catalog records and has a
server-side OpenAI integration; generated AI remains blocked until a provider key
is configured and verified. Tracking controls are explicitly demonstrations; actual
file delivery remains planned. See the [Phase 1 handoff](docs/phase1-completion.md)
for acceptance status, administrator setup, new endpoints, and remaining blockers.
See the [complete programming catalog](docs/programming-catalog.md)
for every title, author, access label, and source link.

## Requirements

- Node 24 LTS recommended; Node 22.12+ or 26 also supports the selected tooling.
- Python 3.13 and PostgreSQL 17, or Docker Desktop for local PostgreSQL.
- Android Studio 2025.2.1+, a separate JDK 21 if Studio bundles another Java version,
  Android SDK platform 36, and SDK build tools for APK builds.
- Git. All commands run from the repository root unless stated otherwise.

Exact installed versions and verification limits are in [testing](docs/testing.md).

## New checkout: install and configure

Copy these files only when the destination does not already contain your settings.
Use the same PostgreSQL password in the root and backend environment files.

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp apps/web/.env.example apps/web/.env
npm ci
docker compose up -d postgres
python3.13 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install -r backend/requirements-dev.txt
cd backend
python -m alembic upgrade head
python -m app.services.seed
```

On Windows PowerShell, use `Copy-Item` instead of `cp`, create the environment with
`py -3.13 -m venv backend/.venv`, and activate with
`.\backend\.venv\Scripts\Activate.ps1`. The subsequent `python` commands are identical.
If PowerShell blocks activation, call `backend\.venv\Scripts\python.exe` directly.

## Run the backend

From the root on macOS/Linux, after installing dependencies:

```bash
cd backend
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Windows: use `.venv\Scripts\python.exe` in place of `.venv/bin/python`.
API health: <http://127.0.0.1:8000/api/v1/health>.
Interactive OpenAPI documentation: <http://127.0.0.1:8000/docs>.

## Run the website

In another terminal, from the root:

```bash
npm run dev
```

Open <http://127.0.0.1:5173>. Use `127.0.0.1` consistently for the local frontend and
API; mixing it with `localhost` can prevent SameSite cookies from working.

This workspace was verified with an isolated Homebrew PostgreSQL 17 cluster on
`127.0.0.1:55432`, using the existing ignored `backend/.env`. It does not require
Docker to run here. The development cluster is `.local/postgres`; restart it with:

```bash
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D .local/postgres -l .local/postgres.log -o '-p 55432 -h 127.0.0.1' start
```

That disposable cluster uses local trust authentication and binds only to loopback.
Use the password-protected Compose configuration for a normal new installation.

## Build and test

```bash
npm run build
npm test
npm run test:e2e
```

Browser tests use installed Google Chrome, start their own frontend and backend,
and use the development database. They create uniquely named test accounts; they
do not reset that database. See [testing](docs/testing.md) for isolated database tests.

## Build Android

Set `VITE_API_BASE_URL=https://YOUR_REACHABLE_API/api/v1` in
`apps/web/.env.production`. Set the website to the same API when building its production
assets. Android refuses HTTP or loopback API addresses; its UI is bundled locally.

```bash
npm run android:sync
npm run android:open
npm run android:apk
adb devices
adb install -r apps/web/android/app/build/outputs/apk/debug/app-debug.apk
```

`android:sync` builds React and copies `dist` into the native project.
`android:open` opens Android Studio. `android:apk` rebuilds, synchronizes, and runs
the checked-in Gradle wrapper's `assembleDebug` on macOS or Windows.

APK output: `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`.
The current debug APK was rebuilt on November 4, 2026. It contains the creator branding,
programming catalog, shared catalog assistant, My Library, favorites, encrypted persistent
Android login, and the deployed HTTPS backend URL. Size: **4,595,620 bytes**. The build uses
Gradle 8.14.3 with JDK 21.
[Android setup, APK metadata, and device instructions](docs/android.md).

## Shared account demonstration

1. Start the single backend and migrate/seed its PostgreSQL database.
2. Register on the website.
3. Build Android against that same reachable HTTPS API and install the APK.
4. Sign in with the same email/password. `/auth/me` returns the same user ID.

The deployed website and installed emulator APK completed this flow with the same
user ID, followed by Android logout and website re-login. The automated suites also
verify the bearer-token contract independently. Physical-phone testing remains pending.

## Project map and documents

| Path | Purpose |
| --- | --- |
| `apps/web/src/` | Screens, reusable components, authentication provider, centralized API client |
| `apps/web/android/` | Generated native application, Gradle wrapper, icon/splash placeholders |
| `backend/app/` | FastAPI routes, validation, Argon2id/session services, SQLAlchemy models |
| `backend/alembic/` | Reversible PostgreSQL schema migration |
| `backend/tests/` | Authentication, catalog, and migration integration tests |
| `.github/workflows/ci.yml` | PostgreSQL-backed backend tests, frontend tests, production build |

- [Architecture](docs/architecture.md), [database design](docs/database-design.md), [API reference](docs/api-reference.md)
- [Backend setup and endpoints](backend/README.md), [AI architecture](docs/ai-architecture.md), [Wasmer deployment](docs/deployment.md)
- [Testing](docs/testing.md), [actual progress](docs/phase1-progress.md)
- [Five-slide presentation](docs/phase1-presentation.md), [Phase 2 roadmap](docs/phase2-roadmap.md)

The backend's separate WASIX dependency lock and local-build deployment path now run
successfully in Wasmer, including real PostgreSQL/authentication/library HTTP checks.
The backend is deployed at `https://backend-shiodr.wasmer.app` with managed PostgreSQL.
The website at `https://elibrary-ai.wasmer.app` uses that same HTTPS API. Public
health/catalog checks passed. The November 4 catalog update passed 12 production
browser checks and 15 installed-APK checks; the November 3 authentication baseline
also passed 16 production browser checks. The frontend
Wasmer manifest includes the SPA fallback required for direct links and refreshes.
For a new production build, set
`VITE_API_BASE_URL=https://backend-shiodr.wasmer.app/api/v1` before rebuilding.

Deadlines: Phase 1 November 7, Phase 2 November 21, final December 5, 2026.
