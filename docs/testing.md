# Phase 1 verification

Updated November 5, 2026 (Asia/Manila). Results below describe executed checks;
physical Android device testing is distinguished from browser and emulator results.

## Expanded Phase 1 implementation — November 4–5, 2026

The [current handoff](phase1-completion.md) records implemented features, endpoints,
migration/deployment commands, APK metadata, and the remaining acceptance blocker.
Overall Phase 1 is **incomplete**: the owner chose to leave OpenAI generation blocked.
Catalog retrieval was exercised against real PostgreSQL on both deployed clients;
neither client returned `mode: "llm"`. No paid provider call was made.

| Check | Observed result |
| --- | --- |
| PostgreSQL backend `pytest -q` | 87 passed against isolated PostgreSQL 17.11; one existing Starlette/httpx deprecation warning |
| `npm test` | 22 passed, including assistant fallback/retry and persistent tracking feedback |
| `npm run build` | TypeScript compilation and Vite production build passed |
| `npm run test:e2e` | 12 desktop/mobile Chrome tests passed against real local FastAPI/PostgreSQL |
| Static/source review | Ruff and whitespace checks passed; focused backend security/correctness review found no material issues |
| Production schema | Packaged migration `0003` applied; application counts preserved across upgrade |
| WASIX and deployment | Package build check and both existing Wasmer app deployments passed; website package is `shiodr/elibrary-ai-web@0.1.6` |
| Production website | Eight checkpoints passed in Chrome against the shared production HTTPS API |
| Expanded Android APK | Build, signature verification, and installation passed; 4,595,620 bytes |
| Installed Android application | Six checkpoints passed on November 5 in the actual API 36 ARM64 Capacitor WebView |
| Credential exclusion | No exact matches for configured secrets or the private QA password across 222 source/build files and APK entries; private files/builds remain ignored |

Backend tests cover administrator authentication and current-role enforcement, reader/guest
denial, expired/revoked sessions, input/duplicate validation, add/edit/archive/restore,
real statistics, and seed preservation of administrator edits. Assistant checks cover real
catalog matches, title/author/category/subject queries, missing topics, archived-book exclusion,
private contextual follow-ups, shared rate limits, and provider failure/structured response
validation. Provider responses are mocked in automated tests; those tests do not establish
live OpenAI connectivity. Existing authentication, ownership, idempotence, five/ten-book
limits, concurrency, migration rollback/reapply, and catalog checks remain in the suite.

Production migration snapshots retained seven users, 32 sessions, 208 books, zero favorites,
and zero downloads while revision advanced from `0002` to `0003`. Later QA created only its
own account and records. The production website run checked ordinary-user/guest 403 responses,
real admin counts, add/edit with a stable ID, archive/public 404, restore/public 200,
contextual Rust retrieval with valid clickable book IDs, archived recommendation exclusion,
and private tracking/favorites. Tracking one free book consumed one slot; repeating it did
not consume another. Every event was labeled `tracking_demo`; no file was delivered.
The sample used a genuine publisher listing, not a fabricated catalog title.

The website's first attempt stopped on a test-selector ambiguity between filter and editor
category labels. No book was created on that attempt. Scoping the selector to the editor
resolved the harness issue; the corrected eight-check run passed. Its sanitized initial
failure remains separate from the final results. Desktop/admin, tablet/dark, and mobile
layouts were exercised, and saved screenshots were visually inspected.

The six native checkpoints verified the website-created account's identical user ID,
synchronized favorites/tracking history, unchanged duplicate usage, administrator restore/archive
visibility after refresh, website-only admin navigation, real assistant IDs and context,
failed-network retry without duplicate messages, clickable details, hardware Back, and
full force-stop/relaunch with the original session and no extra login request. Web Storage
contained no credentials. Android reported a visible keyboard; screenshots showed readable
system bars and navigation above the gesture area, with no horizontal overflow.

Both production runs returned `catalog_only` for assistant replies. Cleanup archived the
sample publisher record, revoked temporary QA administrator access, logged out QA sessions,
and confirmed 200 active programming books. Both owner-requested accounts were separately
verified as administrators through trusted provisioning. Safe results/screenshots and private
QA credentials remain ignored under `.local/phase1-completion`; credentials are never part
of the handoff. The current APK checksum is recorded in [Android instructions](android.md).

The final direct Python/Node/curl health rechecks encountered routing errors or connection
timeouts for both app domains. A fresh actual Chrome process then loaded both successfully:
the website returned HTTP 200 with its creator-branded title, and `/health` returned HTTP 200
with `{"status":"ok","database":"postgresql","phase":1}`. Wasmer metadata separately
confirmed both existing apps and their active versions. No deployment or TLS setting was
changed to mask the probe failure. Direct-client reachability remains a local/environment
limitation to investigate if it recurs; these results do not establish availability from every
network or client.

Remaining checks: live generated AI on both clients, the expanded APK on an actual phone,
other browsers/privacy settings, assistive technology, signed release delivery, Docker runtime,
and hosted CI. Earlier Samsung testing was user-reported and used an earlier APK. Earlier
dated foundation/catalog/session results below are retained as historical evidence.

## Creator branding — November 4, 2026

The website now displays `by shio del rio` beneath the shared logo, `Created by shio del rio` in
the landing/application footers, and creator metadata in the page title and head.
The existing Wasmer website was deployed with package `shiodr/elibrary-ai-web@0.1.5`.
Live Chrome inspection confirmed the landing and guest application credits; the
login page uses the same shared logo component. The landing and application layouts
fit both 320- and 412-pixel widths without
horizontal overflow. Mobile screenshots were visually inspected.

All eighteen frontend tests and the TypeScript/Vite production build passed.
The Android branding APK also built successfully and passed signature verification.
Its compiled launcher label is `E-Library AI by shio del rio`; inspection confirmed the
creator credits in its bundled assets and the original application ID. This build
is 4,595,620 bytes; its current checksum is in [Android instructions](android.md).
It retains the previously tested persistent-login implementation; native session
checks were not repeated for this branding-only update. Safe live-browser evidence
is ignored under `.local/branding-qa`.

## Android login persistence fix — November 4, 2026

The user reported testing the earlier APK on a Samsung phone and losing login
after reopening it. Investigation confirmed that the Android bearer existed only
in JavaScript memory. The corrected APK restores an Android Keystore-encrypted
session before checking `/auth/me` and opens the dashboard for a valid session.
Website authentication continues to use HttpOnly cookies.

| Check | Observed result |
| --- | --- |
| `npm test` | 18 passed: existing interface checks, eight native storage regressions, and startup restoration ordering |
| `npm run build` | TypeScript compilation and Vite production bundle passed |
| `npm run test:e2e` | Six desktop/mobile Chrome checks passed against real local FastAPI/PostgreSQL |
| `npm run android:apk` | Build passed; 153 tasks, 30 executed and 123 up to date |
| APK signature and install | `apksigner verify` passed; dedicated emulator installation returned `Success` |
| Installed APK persistence | Seven checkpoints passed on the actual API 36 ARM64 WebView against the production HTTPS API |
| Persistence-fix APK | 4,468,507 bytes; subsequently replaced by the branding APK at the same output path |

The native checks verified encrypted private storage without plaintext credentials,
full force-stop/relaunch into the dashboard with the same user and unchanged
original session token, offline profile failure and successful retry, explicit
logout surviving relaunch, external revocation clearing the saved session, corrupt
ciphertext requiring login, and absence of QA passwords/tokens from Logcat and
Web Storage. The restored dashboard screenshot was visually inspected.

The first restart harness attempt reused a cached, closed WebView. Its sanitized
failure was preserved; the harness now waits for removal and attaches a fresh
WebView after each force-stop. The corrected seven-check run passed without product
failures. Detailed results and safe screenshots are ignored under `.local/session-qa`.
The corrected APK still needs confirmation on the user's Samsung phone; agent-run
verification used the emulator. No backend migration or authentication-secret change
was required for this fix.

The browser rerun initially could not start because the existing local PostgreSQL
cluster was stopped. After starting that same loopback-only cluster, all six browser
checks passed. No database reset or product-code change was needed.

## Programming catalog verification — November 4, 2026

These results precede the Android persistence fix above; the catalog APK was
replaced at the same output path by the current APK.

| Check | Observed result |
| --- | --- |
| PostgreSQL backend `pytest -q` | 46 passed against the isolated PostgreSQL 17.11 test database |
| `npm test` | 9 passed, including paid publisher source labels |
| `npm run build` | TypeScript compilation and Vite production bundle passed |
| `npm run test:e2e` | 6 desktop/mobile browser tests passed against real FastAPI/PostgreSQL |
| Source manifest | 200 unique titles and source URLs; 60 Rust, 34 free online editions, 166 paid listings |
| Migration and import | `0002` upgrade, downgrade/re-upgrade preservation, and repeated seed passed; existing IDs and history retained |
| WASIX package | Package build check and packaged seed against the isolated test database passed |
| Production rollout | Migration `0002`, backend deployment, frontend deployment, and catalog import succeeded |
| Production data preservation | 200 active titles and eight archived samples; existing account, favorite, and download counts unchanged during import |
| Deployed website | 12 catalog checkpoints passed in Chrome against the production HTTPS API |
| Android debug APK | Rebuilt, signature verified, installed successfully; 4,306,106 bytes |
| Installed Android APK | 15 checkpoints passed in the actual API 36 ARM64 Capacitor WebView |
| Static checks | Ruff and `git diff --check` passed |

The added backend checks cover all 200 records across pagination, duplicate manifest
rejection, idempotent import, retained IDs, preserved archived favorites/downloads and
allowance usage, custom catalog entries, and paid-book download rejection without
consuming quota. Existing authentication, concurrency, and five/ten-book limit checks
remain part of the 46-test suite.

The production website run checked four public API pages of 50 unique records,
the exact category distribution, Rust-first homepage cards, 12-card Explore pages,
distinct next-page IDs, Rust/Python filters, authorized free and paid source links,
paid download rejection with unchanged guest usage, logout, and a 412-pixel layout.
All 23 observed API requests used the production HTTPS backend.

The updated native run verified bundled `https://localhost` assets, registration,
invalid/valid login, the website account's matching user ID, guests, logout/replay
rejection, the 200-title/60-Rust catalog, pagination, free/paid labels, hardware Back,
loading/error/retry, website re-login, and Back-to-exit. Android reported a visible
keyboard. The catalog screenshot was visually checked for readable system bars and
navigation above the gesture area; layout measurements found no horizontal overflow.
Physical-phone testing and release signing remain pending.

The source audit returned 165 direct HTTP 200 responses. Thirty-four publisher pages
blocked automated requests and one author page had a client certificate-chain failure;
their metadata was separately checked through primary web sources. This is not a
claim that every source passed a direct HTTP check. No book files were downloaded,
and no purchases or publisher subscriptions were made. See the full
[catalog and source list](programming-catalog.md).

Safe screenshots and detailed results are ignored under `.local/catalog-curation`.
QA account credentials are kept separately in ignored mode-600 files. The current
APK checksum is recorded in [Android instructions](android.md).

## Historical Phase 1 baseline — November 3, 2026

The following results describe the earlier eight-book build. They remain as dated
evidence; the November 4 results above describe the current catalog and APK.

| Check | Observed result |
| --- | --- |
| `npm run build` | Passed TypeScript compilation and Vite production bundle |
| `npm test` | 8 passed; landing, form validation, login success/error, guest navigation/logout, intended route, retry, stale refresh, revoked logout |
| PostgreSQL backend `pytest -q` | 38 passed against PostgreSQL 17.11 |
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
| Android toolchain | Android Studio, JDK 21, SDK 36, build/platform/command-line tools and ARM64 emulator installed and verified |
| Android debug APK | Build passed: 153 tasks; 4,305,221-byte APK; signature verification and emulator installation passed |
| Installed Android APK tests | 15 checkpoints passed on the API 36 ARM64 emulator; actual Capacitor WebView and production backend |
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
Configuration and migration regression checks also verify explicit TLS modes, Wasmer
private-CA migration settings, and the root service response used by deployment checks.
Starlette emits one deprecation warning about its `httpx` TestClient integration;
the executed suite passes. The production application does not depend on httpx.

Browser tests exercise real FastAPI/PostgreSQL, including failure feedback and
both cookie and bearer contracts. Unit-test fetch fixtures are confined to test code.
Mobile browser emulation is not evidence of native APK, safe-area, or hardware Back
behavior. A mobile dashboard screenshot was visually inspected. Physical-device
verification and a full assistive-technology review remain pending. Deployed
cross-origin cookies passed the Chrome checks below; other browser privacy
configurations remain unverified.

## Production website verification — November 3, 2026

Real Chrome exercised `https://elibrary-ai.wasmer.app` against
`https://backend-shiodr.wasmer.app/api/v1`: **16 checkpoints passed, zero failed**.
The checks covered direct protected links, registration, authenticated profiles,
valid/invalid login, session persistence after refresh, logout and revoked-cookie
replay, guests, eight real catalog records, Darwin search, and a 412-pixel layout.
All 37 observed API requests used the deployed HTTPS backend.

Cookie inspection confirmed Secure, HttpOnly, SameSite=None, a host-only backend
domain, and `/api/v1` path scope. Credentialed CORS allowed the exact frontend origin.
The script found no token/password keys in browser Web Storage and did not print
passwords, tokens, request headers, or authentication response bodies.

This run initially exposed a real hosting bug: React deep links and page refreshes
received HTTP 404 from the static server. The Wasmer manifest now explicitly serves
`/public/index.html` as its SPA fallback. Local packaged-server proof passed, then
the existing website was redeployed. The strict production rerun verified direct
links and registered/guest refreshes returning HTTP 200 without recovery workarounds.

The website-created account also authenticated through the deployed Android bearer
API contract, accessed its profile/catalog, revoked its native session, and signed
back into the website. That contract check alone is not evidence of an installed APK.
Detailed local evidence and screenshots are ignored under `.local/phase1-qa`; the
generated QA account credentials stay in a separate mode-600 ignored file.

## Installed Android APK verification — November 3, 2026

The signed debug APK was installed with ADB on the dedicated Android 16 ARM64
emulator. **15 checkpoints passed**, using the actual `com.elibraryai.app` process
and Capacitor WebView. Runtime inspection confirmed native Android and bundled
`https://localhost` UI assets; this localhost origin is the local UI container.
Every observed API request used `https://backend-shiodr.wasmer.app`.

Verified native registration, valid/invalid login, guest access, logout and revoked
bearer rejection, eight database books, book previews, Back navigation and activity
exit, loading states, and network-error feedback/retry. Failure injection aborted
one test request; successful requests and retries still used the real production API.
No user/session token was stored in Web Storage.

The account registered on the deployed website signed into the installed APK with
the same user ID, loaded the catalog, signed out, and then signed back into the
website. This provides actual Android-to-website shared-account evidence beyond
the separate bearer-contract test.

Android reported a visible input method. An additional empty-form screenshot showed
the real email keyboard, visible login controls, and readable system bars. Clean
landing/catalog screenshots were visually checked for safe areas, gesture-bar
spacing, and horizontal overflow. These checks cover the recorded emulator, not
every physical phone, display, accessibility service, or keyboard implementation.

The first cold emulator start displayed a System UI ANR dialog while Gradle was
using RAM. The Gradle daemon was stopped and the dialog dismissed before the final
stable GUI run. Initial harness failures involved a hidden mobile link, unsupported
WebView `tap`, and a five-second assertion timeout; the corrected harness reran all
15 checks successfully. They were not hidden or reported as passing app tests.

Native results and safe screenshots remain ignored under `.local/phase1-qa`.
Physical-device installation, hardware-specific insets, and other Android versions
remain unexecuted manual checks. No release APK or release-signing configuration
was created.

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
| Installed Android tools | Android Studio 2026.2.2.8, Homebrew JDK 21.0.13.0.3, command-line tools 22.0, Build-Tools 36.0.0, Platform-Tools 37.0.1, emulator 37.2.13 |
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
