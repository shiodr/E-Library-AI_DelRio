# Phase 1 implementation and demonstration handoff

Updated November 5, 2026 (Asia/Manila).

**Overall status: incomplete because live AI generation remains blocked.**
The implemented catalog retrieval works without an AI key and is explicitly labeled as retrieval,
not an operational LLM. The OpenAI integration is implemented, but a successful live provider
request is not claimed. The owner chose to leave generation blocked for now. Backend,
browser, production website, and installed-emulator verification passed as recorded below.

The existing website and Capacitor Android application retain one React frontend, FastAPI
backend, PostgreSQL database, and authentication system. The catalog contains 200 programming
titles, including 60 Rust books: 34 free online editions and 166 paid publisher listings.
See the [reviewed catalog](programming-catalog.md) for sources and access terms.

## Implemented feature paths

| Feature | Implementation |
| --- | --- |
| Shared assistant | `/app/assistant` on both platforms; suggestions, messages, loading/retry, contextual follow-ups, and real book cards |
| Catalog grounding | Searches active PostgreSQL records before generation; cards use validated, current book IDs |
| AI integration | OpenAI Responses API, two read-only tools, bounded calls, structured validation, and explicit fallback modes |
| Website administration | `/app/admin`; frontend protection and current database-role checks on every admin API request |
| Dashboard | Real book/user/tracking counts, categories, recent additions, and recent tracking events |
| Book management | Add, edit, search, paginate, archive, and restore; stable IDs and preserved history |
| Seed compatibility | Administrator ownership and original seed-source identity prevent imports from undoing edits or archives |
| Tracking demonstration | Free-book details record a labeled request demonstration; My Library shows private history and allowance |
| Favorites | Registered users save, view, and remove favorites across their shared account |
| Native sessions | Existing Android Keystore-encrypted login restoration remains in place |

These are implemented code paths. Executed verification is recorded separately below.
After refresh, administrator changes appear in both public clients. Archived books are hidden
from public catalog searches and assistant retrieval; administrators and private historical
records can still reference them.

## AI provider configuration

Configure only backend environment files or hosting secrets:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
ASSISTANT_REQUESTS_PER_HOUR=20
ASSISTANT_GLOBAL_REQUESTS_PER_HOUR=100
```

The integration calls the fixed OpenAI Responses endpoint. `gpt-5-mini` is the configurable
default. Keep real values privately in `backend/.env` for development and
`backend/.env.production` for deployment, then restart/redeploy the backend. Never put a
provider key in `VITE_*`, website assets, Android resources, Git, or public documentation.

`GET /api/v1/assistant/status` reports configuration, not provider health, billing, or model
access. An actual chat must return `mode: "llm"` before generated AI is reported operational.
`catalog_only` means database retrieval without generation. `provider_error` means generation
failed and the answer explicitly falls back to real catalog retrieval. See
[AI architecture](ai-architecture.md) for the implemented tools, context, and limits.

## Secure administrator setup

No public administrator registration exists. First register the intended account normally.
Then use a trusted backend shell to grant access to that existing account:

```bash
cd backend
source .venv/bin/activate
python -m app.services.admin_access --email admin@example.com --grant
```

For the production database, select its ignored backend environment file explicitly:

```bash
python -m app.services.admin_access --email admin@example.com --env-file .env.production --grant
```

Replace the placeholder email locally with the registered account's address. No password is
created or supplied on the command line. The command does not print database credentials.
Refresh the profile or sign out and back in, then open `/app/admin` on the website.
To revoke access:

```bash
python -m app.services.admin_access --email admin@example.com --env-file .env.production --revoke
```

The backend reloads the current role on each administrative request. Readers and guests
receive 403; absent, expired, and revoked sessions receive 401. A stale frontend role display
cannot authorize an operation. The Android interface does not expose the website-only dashboard.
Both owner-requested accounts were provisioned through this trusted procedure and verified
as administrators. Their addresses and credentials are omitted from this public handoff.

## New API endpoints

All paths use the existing `/api/v1` prefix and cookie/native-bearer authentication.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/assistant/status` | Provider configuration status; current session required |
| POST | `/assistant/chat` | Catalog-backed conversation; current session required |
| GET | `/admin/overview` | Database statistics and recent activity |
| GET | `/admin/books` | Paginated search/filter across active and archived books |
| POST | `/admin/books` | Add an active book |
| PUT | `/admin/books/{book_id}` | Replace supported metadata, retaining the ID |
| POST | `/admin/books/{book_id}/archive` | Hide a book while preserving records |
| POST | `/admin/books/{book_id}/restore` | Restore public and assistant visibility |

Every `/admin/*` route requires an administrator. There is no permanent-delete endpoint.
Book validation rejects extra fields, empty required values, invalid access types, oversized
metadata, and non-HTTPS or credential-bearing source/cover URLs. Duplicate source URLs or
normalized title/author pairs return 409. Book writes and bootstrap seeding share a PostgreSQL
transaction advisory lock.

Assistant request example:

```json
{"message":"Find beginner-friendly Rust books."}
```

Include the returned `conversation_id` on a follow-up. Use runtime book IDs returned by the
catalog for navigation; no demonstration IDs are hardcoded.

## Download tracking is a demonstration

The existing `GET /api/v1/downloads` and `POST /api/v1/downloads` contracts remain. Responses
now identify `event_type: "tracking_demo"`. No book bytes, signed file URL, or successful file
delivery is fabricated.

On a free online edition, choose **Record tracking demonstration**, then open **My Library**.
Messages and history explicitly distinguish the record from a file download. Repeating a
recorded book is idempotent and does not consume another allowance slot. Guests have five
distinct tracked books per guest session; registered accounts have ten across sessions and
platforms. Account usage survives logout/login. Another owner cannot read those private records.
Paid publisher listings cannot consume a new tracking slot.

The administrator activity list labels these events as demonstrations. External author/publisher
links control reading access and are outside the application's quotas. Actual hosted book-file
delivery remains later-phase work, as allowed by the supplied Phase 1 brief.

## Migration and local commands

Migration `0003_phase1_assistant_admin.py` follows `0002`. It adds:

- `books.is_managed_by_admin`, initially false.
- `books.seed_source_url`, backfilled from existing source URLs.
- Owner-bound `assistant_conversations` with bounded JSON history.
- Shared `assistant_rate_limits` counters.

The upgrade retains book IDs, users, sessions, favorites, download history, and usage. It does
not require reseeding an initialized catalog. An explicit downgrade removes assistant state
and administrator ownership markers; it is not a data-preserving production rollback. Obtain
approval and back up before any destructive rollback.

Use [existing setup instructions](../README.md#new-checkout-install-and-configure) for dependencies
and private database configuration. With the existing environment and database ready:

```bash
cd backend
source .venv/bin/activate
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

For a new, empty development database only, run `python -m app.services.seed` after migration.
In a second terminal at the repository root, run `npm run dev` and open
`http://127.0.0.1:5173`. Keep local frontend/API hosts consistent for cookies.

Create a separate test database whose name ends in `_test`. For Compose, run once from root:

```bash
docker compose exec postgres sh -c 'createdb -U "$POSTGRES_USER" elibrary_test'
```

Export `TEST_DATABASE_URL` with its private connection string before running:

```bash
cd backend
source .venv/bin/activate
python -m pytest -q
```

Tests reject a missing test URL or database name without `_test`. They truncate account data
and exercise rollback only in that isolated database. Run suites serially against a shared test
database. Never use useful development/production data. Windows can invoke
`.venv\Scripts\python.exe` directly instead of activating the Unix environment.

Frontend checks, from root:

```bash
npm test
npm run build
npm run test:e2e
```

Browser tests require the migrated/seeded development database and installed Chrome.
See [testing](testing.md) for environment details and results.

## Production deployment order

Keep the existing Wasmer application identities, shared API URL, CORS, and private environment
conventions. Rebuild WASIX, verify `0003` against an isolated test database, and back up before
production migration. From the root with the existing resolved WASIX wheel cache:

```bash
backend/.venv/bin/python backend/scripts/build_wasmer.py --packages backend/.wasmer-build/packages
wasmer package build --check backend
wasmer run backend --entrypoint migrate --net --env-file backend/.env.production
wasmer run backend --entrypoint check --net --env-file backend/.env.production
wasmer deploy --dir backend --env-file backend/.env.production --non-interactive
```

After the new backend is available, build/deploy both clients with the same reachable HTTPS
`VITE_API_BASE_URL` ending in `/api/v1`:

```bash
npm run build
wasmer deploy --dir apps/web --non-interactive --bump
npm run android:apk
```

Wasmer package versions are immutable; `--bump` publishes a new frontend package version.
APK output is `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`. Install over the
existing app with the same signing identity. Verify real web-cookie and native-bearer behavior
against the deployed API before demonstrating. See [deployment](deployment.md) and
[Android setup](android.md) for TLS, CORS, toolchain, and installation details.

## Academic demonstration

1. Register on the website and sign into Android with the same account; confirm matching identity.
2. Browse the catalog, search by title/author, filter by category, and open book details.
3. Ask for beginner Rust/Python books, open a returned card, and ask a contextual follow-up.
4. Identify the response mode honestly; no-key retrieval does not establish working AI generation.
5. Use a provisioned website administrator to show real overview counts.
6. Add a legitimate authorized book, edit, archive, and restore it. Refresh both clients and
   assistant searches to show visibility changes. Use labeled fixture records only in an isolated QA database.
7. Record a free-book tracking demonstration; show history, unchanged repeat usage, shared account
   records on the other platform, and the administrator activity entry.
8. Save/remove a favorite, sign out, and demonstrate denial of administrator access for ordinary users/guests.

## Final acceptance and verification

Implemented source is not executed proof. Previous dated foundation, catalog, branding, and
native-session results remain in [testing](testing.md); they do not automatically prove new features.

| Acceptance gate | Current verification status |
| --- | --- |
| Backend auth/admin/assistant/tracking/migration/seed regression suite | 87 tests passed against isolated PostgreSQL 17.11; provider calls mocked |
| Frontend tests and production build | 22 unit tests passed; TypeScript/Vite build passed |
| Browser roles, add/edit/archive/restore, and real overview counts | 12 desktop/mobile local browser tests and eight production website checkpoints passed |
| Shared retrieval, valid book IDs, follow-ups, private context, error modes | Backend/browser regressions passed; real production retrieval and follow-ups passed on website and installed APK |
| Actual OpenAI-generated responses on website and Android | Blocked by owner choice; both clients returned `catalog_only`, not `llm` |
| Production migration, WASIX package, backend/frontend deployment and smoke checks | Migration `0003`, package check, and both existing Wasmer deployments passed |
| Expanded APK build/signature/emulator navigation and synchronization | Build/signature/install passed; six installed API 36 ARM64 emulator checkpoints passed |
| Current expanded APK on a physical phone | Pending; earlier Samsung testing was user-reported |
| Documentation, secret exclusion, and Git handoff | Handoff updated; credential scans passed; source remains uncommitted pending approval |

Production migration checks retained all pre-upgrade rows: seven users, 32 sessions,
208 books, zero favorites, and zero downloads. Revision advanced from `0002` to `0003`;
200 books remained active. Later QA intentionally created its own account, one genuine
publisher record, a favorite, and one explicitly labeled tracking demonstration. The sample
book was archived and temporary QA administrator access revoked after both platform runs.
Final cleanup confirmed 200 active books. No existing account or catalog history was reset.

The production website remains [elibrary-ai.wasmer.app](https://elibrary-ai.wasmer.app),
with frontend package `shiodr/elibrary-ai-web@0.1.6`. Both clients use
`https://backend-shiodr.wasmer.app/api/v1`. Migration and deployment reused the existing apps.
Final fresh Chrome checks returned HTTP 200 for the website and PostgreSQL `/health`.
Direct command-line probes encountered network timeouts; that environment limitation is
recorded separately in [testing](testing.md), rather than hidden by changing deployment settings.

The rebuilt, installed debug APK is
`apps/web/android/app/build/outputs/apk/debug/app-debug.apk` (4,595,620 bytes), SHA-256
`5146b8a6a1dbfa7af29a8400d4a3c267592d0f3c6a0b0cc628df873a597e360f`.
Package/signing identity are unchanged. The November 5 emulator run confirmed cross-platform
favorites/history, idempotent usage, restored/archived catalog visibility, real assistant IDs,
context and network-error retry, hardware Back, visible keyboard, safe-area layout, and the
same original session after a full process restart. This is not physical-phone proof.

Phase 1 remains incomplete while required AI generation is blocked. No paid provider call
was made. When generation is authorized, configure the backend key, redeploy, and verify
actual `mode: "llm"` replies on both platforms. Install this APK over the existing Samsung
application and repeat the hardware demonstration separately. See [testing](testing.md)
for the executed evidence and remaining limitations.

## Principal files and Git handoff

- Backend routes: `backend/app/api/admin.py`, `api/assistant.py`, and registration/CORS in `app/main.py`.
- Services: `backend/app/services/assistant.py`, `admin_access.py`, and administrator-safe `seed.py`.
- Persistence/config: `backend/app/models/entities.py`, `core/config.py`, `core/tls.py`, `schemas/library.py`, and migration `0003_phase1_assistant_admin.py`.
- Shared UI: `apps/web/src/pages/Assistant.tsx`, `assistant.css`, `Library.tsx`, and actions in `BookDetail.tsx`.
- Website admin UI: `apps/web/src/pages/Admin.tsx`, `admin.css`, routes in `App.tsx`, and `components/AppLayout.tsx` navigation.
- Regression evidence: backend `test_admin.py`, `test_admin_access.py`, `test_assistant.py`, seed/migration tests, frontend tests, and browser/native records in [testing](testing.md).
- Safe configuration/handoff: backend environment examples, this document, and [AI architecture](ai-architecture.md).

Earlier authorized catalog, native-session, and creator-branding changes are also uncommitted.
Review the complete diff before staging. Real environment files, QA credentials, APKs, local
databases, and signing stores must stay ignored. Request confirmation after presenting the
reviewable Git summary; this document does not authorize a commit.

## Working-tree file inventory

This inventory includes the earlier authorized catalog, session, and branding work alongside
the expanded Phase 1 implementation. It lists non-ignored paths awaiting review; it does not
include private configuration, generated APKs/assets, databases, or QA credentials.

### Created

- `apps/web/android/app/src/main/java/com/elibraryai/app/NativeSessionPlugin.java`
- `apps/web/e2e/phase1-completion.spec.ts`
- `apps/web/src/lib/api.test.ts`
- `apps/web/src/pages/Admin.tsx`
- `apps/web/src/pages/Assistant.tsx`
- `apps/web/src/pages/Library.tsx`
- `apps/web/src/pages/admin.css`
- `apps/web/src/pages/assistant.css`
- `backend/alembic/versions/0002_programming_catalog.py`
- `backend/alembic/versions/0003_phase1_assistant_admin.py`
- `backend/app/api/admin.py`
- `backend/app/api/assistant.py`
- `backend/app/core/tls.py`
- `backend/app/data/programming_books.json`
- `backend/app/services/admin_access.py`
- `backend/app/services/assistant.py`
- `backend/app/services/catalog.py`
- `backend/tests/test_admin.py`
- `backend/tests/test_admin_access.py`
- `backend/tests/test_assistant.py`
- `backend/tests/test_catalog_import.py`
- `docs/phase1-completion.md`
- `docs/programming-catalog.md`

### Modified

- `README.md`
- `apps/web/android/app/src/main/java/com/elibraryai/app/MainActivity.java`
- `apps/web/android/app/src/main/res/values/strings.xml`
- `apps/web/capacitor.config.ts`
- `apps/web/e2e/phase1.spec.ts`
- `apps/web/index.html`
- `apps/web/playwright.config.ts`
- `apps/web/src/App.test.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/components/AppLayout.tsx`
- `apps/web/src/components/ui.tsx`
- `apps/web/src/context/AuthContext.tsx`
- `apps/web/src/lib/api.ts`
- `apps/web/src/pages/BookDetail.tsx`
- `apps/web/src/pages/Dashboard.tsx`
- `apps/web/src/pages/Explore.tsx`
- `apps/web/src/pages/Landing.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/types.ts`
- `apps/web/wasmer.toml`
- `backend/.env.example`
- `backend/README.md`
- `backend/app/api/books.py`
- `backend/app/core/config.py`
- `backend/app/core/database.py`
- `backend/app/main.py`
- `backend/app/models/__init__.py`
- `backend/app/models/entities.py`
- `backend/app/schemas/books.py`
- `backend/app/schemas/library.py`
- `backend/app/services/library.py`
- `backend/app/services/seed.py`
- `backend/scripts/smoke_api.py`
- `backend/tests/conftest.py`
- `backend/tests/test_catalog.py`
- `backend/tests/test_database.py`
- `backend/tests/test_library.py`
- `docs/ai-architecture.md`
- `docs/android.md`
- `docs/api-reference.md`
- `docs/architecture.md`
- `docs/database-design.md`
- `docs/deployment.md`
- `docs/phase1-progress.md`
- `docs/phase2-roadmap.md`
- `docs/testing.md`
