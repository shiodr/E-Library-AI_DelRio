# Phase 1 verification

Updated November 2, 2026 (Asia/Manila). Results below describe executed checks,
not a promise of cloud deployment or physical Android testing.

## Results

| Check | Observed result |
| --- | --- |
| `npm run build` | Passed TypeScript compilation and Vite production bundle |
| `npm test` | 8 passed; landing, form validation, login success/error, guest navigation/logout, intended route, retry, stale refresh, revoked logout |
| PostgreSQL backend `pytest -q` | 31 passed against PostgreSQL 17.11 |
| `npm run test:e2e` | 6 passed in installed Chrome: three desktop and three Pixel 7 viewport tests |
| Migration upgrade | Applied initial five-table schema to development and test databases |
| Migration rollback/reapply | Passed on dedicated test database; model/schema comparison has no differences |
| Idempotent seed | Eight real starter records, four categories; no files downloaded |
| Shared identity | Real browser registration followed by Android bearer login/profile/logout; same user ID |
| `python -m pip check` | No broken requirements |
| Python dependency audit | No known vulnerabilities in the recorded constraints |
| `npm audit --omit=dev` | No known production dependency vulnerabilities |
| Full `npm audit` after lockfile update | No known vulnerabilities, including development dependencies |
| Android add | Generated native project successfully with official Capacitor CLI |
| Android Gradle build | Attempted; blocked because no Java runtime is installed |
| Wasmer dependency resolution | Passed with separate pinned WASIX wheels; native lock unchanged |
| Wasmer package build | `wasmer package build --check backend` passed |
| Packaged migration/seed commands | Ran successfully against the isolated PostgreSQL test database; seed remained idempotent |
| Wasmer runtime/database | Packaged app imports, PostgreSQL connection, migration revision, Argon2id and production settings passed |
| Existing password compatibility | Actual old four-lane Argon2id hash verified in WASIX |
| Wasmer HTTP smoke | Real web-cookie/native-bearer authentication, shared identity, favorites, tracking, guest fifth/sixth request limit, repeats, logout passed |
| WASIX upstream-version audit | No known vulnerabilities; upstream base versions checked, not a bespoke WASIX binary security audit |

The backend suite covers registration, case-insensitive duplicates, invalid/valid
login, separate guests, authenticated profiles, anonymous rejection, server expiry,
logout/replay rejection, Argon2id/digest storage, session rotation, CORS/Origin rules,
role-field rejection, real catalog search/filter/pagination, and reversible migrations.
The expanded suite additionally verifies favorite ownership/idempotency, ten-book
account persistence after login, guest separation, concurrent requests at both quota
boundaries, expiry while blocked on an account lock, environment HMAC secrets,
legacy sessions, password rehash, and the deployed site's CORS/DELETE preflight.
Starlette emits one deprecation warning about its `httpx` TestClient integration;
the executed suite passes. The production application does not depend on httpx.

Browser tests exercise real FastAPI/PostgreSQL, including failure feedback and
both cookie and bearer contracts. Unit-test fetch fixtures are confined to test code.
Mobile browser emulation is not evidence of native APK, safe-area, or hardware Back
behavior. A mobile dashboard screenshot was visually inspected. Physical-device
verification, full assistive-technology review, and deployed cross-origin cookie
behavior remain pending.

## Repeat backend tests safely

Tests refuse a missing `TEST_DATABASE_URL` or any database name that does not end
in `_test`. They truncate account/session tables and exercise destructive migration
rollback only in that explicitly selected test database. Never point them at useful data.

For a Compose installation, create a separate database once:

```bash
docker compose exec postgres sh -c 'createdb -U "$POSTGRES_USER" elibrary_test'
cd backend
source .venv/bin/activate
export TEST_DATABASE_URL='postgresql+pg8000://elibrary:change-this-local-password@127.0.0.1:5432/elibrary_test'
python -m pytest -q
```

For the existing verified Homebrew cluster, use
`postgresql+pg8000://elibrary@127.0.0.1:55432/elibrary_test` instead.
PowerShell: `$env:TEST_DATABASE_URL='postgresql+pg8000://...'`, then
`.venv\Scripts\python.exe -m pytest -q` from `backend`.
Set `TEST_DB_SSL=true` for a remote test PostgreSQL server that requires verified TLS.

## Repeat frontend and browser checks

```bash
npm ci
npm test
npm run build
npm run test:e2e
```

Playwright uses installed Google Chrome (`channel: 'chrome'`). If Chrome is absent,
install it or change the configuration to an installed Playwright Chromium browser.
The browser suite starts Vite and Uvicorn and requires a migrated/seeded development
database. It creates test accounts with unique `@example.com` addresses without
resetting that database. Ports 5173 and 8000 must be available, or already serve this
application with matching configuration. Browser traces/screenshots remain ignored.

## Installed versions

| Layer | Verified versions |
| --- | --- |
| Runtime | Node 26.12.1, npm 11.20.0, Python 3.13.18, PostgreSQL 17.11 |
| Frontend | React/React DOM 19.3.1, Vite 7.3.7, TypeScript 5.9.3, Tailwind 4.3.3 |
| Navigation/animation | React Router 7.18.5, Motion 12.43.0, Lucide 0.468.0 |
| Android | Capacitor core/CLI/Android 8.6.0, App 8.1.2, Status Bar 8.0.4 |
| Native build configuration | Gradle 8.14.3, AGP 8.13.0, JDK 21 required, SDK 36 |
| Backend | FastAPI 0.162.0, Uvicorn 0.54.0, Pydantic 2.14.2, settings 2.16.2 |
| Persistence/security | SQLAlchemy 2.0.55, Alembic 1.20.1, pg8000 1.31.6, Argon2 CFFI 25.1.0 |
| Tests | Vitest 5.0.5, Playwright 1.64.1, pytest 9.2.0, httpx 0.28.1 |

`package-lock.json` locks npm packages. `backend/requirements.txt` pins direct
runtime packages; `constraints.txt` fixes all observed transitive versions without
installing development tools in production. `requirements-dev.txt` adds test/audit
tools. npm's glob/minimatch overrides address build-tool advisories while retaining
Capacitor 8; Capacitor generation/synchronization must be rechecked after changing them.

`requirements-wasmer.txt` and `constraints-wasmer.txt` separately pin WASIX-compatible
Pydantic 2.13.4+wasix.2/core 2.46.4+wasix.3, Argon2 bindings 25.1.0+wasix.2, CFFI
2.1.0+wasix.3, and their dependencies. Runtime package `python/python@=3.13.19`
reports CPython 3.13.15. Wasmer CLI 7.5.0 was exercised. The default native profile
retains its original Pydantic 2.14.2 dependency lock. Both profiles use the same backend source.

Source references: [Vite runtime requirements](https://vite.dev/guide/),
[Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite),
[Capacitor toolchain](https://capacitorjs.com/docs/getting-started/environment-setup).
