# Phase 1 progress — updated November 2, 2026

Phase 1 deadline: November 7. Phase 2: November 21. Final: December 5, 2026.

## Implemented and exercised

- One React/TypeScript/Vite frontend with Tailwind, React Router, Lucide, and Motion.
- Welcome, registration, login, guest dashboard, catalog search/filter, book preview,
  My Library/Favorites empty states, and embedded AI design preview.
- Light/dark themes, responsive navigation, form feedback, loading/retry, reduced motion,
  native safe-area styles, and native Back handling source.
- One FastAPI backend and PostgreSQL database with five requested tables, indexes,
  relationship checks, uniqueness constraints, and reversible Alembic migration.
- Real Argon2id registration/login, duplicate rejection, opaque expiring sessions,
  guest separation, current-profile endpoint, server logout revocation, and restricted origins.
- Eight seeded public-domain book metadata records in four categories, with source/license
  attribution. No book files or copyrighted covers are redistributed.
- Generated Android project, official Capacitor dependencies, app name/ID, Gradle wrapper,
  Internet permission, release cleartext prohibition, native memory-only sessions,
  icon/splash placeholders, and cross-platform build scripts.
- Documentation, environment examples, Compose PostgreSQL, dependency locks, and CI workflow.
- Backend favorites and download tracking, with account/session ownership, atomic five/ten-book
  quotas, idempotent repeats, and usage fields that preserve frontend compatibility.
- Backend-only HMAC session secret, legacy session/hash compatibility, root `/health`,
  deployed-website CORS, and a locally exercised WASIX package/deployment workflow.

## Executed proof

Backend: **31 tests passed** against PostgreSQL, including migration rollback/reapply and quota races.
Frontend: **8 tests passed**. Browser: **6 tests passed**, across desktop/mobile Chrome.
Production TypeScript/Vite build passed. Web registration followed by Android-style
bearer authentication returned the same database user ID. See [testing](testing.md)
for exact scope, warnings, versions, and commands.

## Remaining verification and external prerequisites

- APK compilation: attempted, blocked by absent JDK/Android SDK. Install Android Studio,
  configure the documented SDK/JDK, build, and test on an actual device.
- Reachable HTTPS backend: not deployed. Native build configuration must be set to
  that backend before APK synchronization. No default localhost API can pass native checks.
- Wasmer native-wheel compatibility is resolved with a separate WASIX lock. The package
  serves HTTP requests and passes local authentication/library smoke tests. Production
  backend publication and database setup still require the user's account/credentials.
- Compose and Dockerfile execution: files supplied; Docker was not installed here.
- GitHub CI: workflow supplied; it has not run on GitHub. Existing Git repository is
  preserved; changes are uncommitted, and no remote push was made.
- Native hardware Back/status-bar/insets and deployed cookie behavior need device/cloud checks.

The web/backend foundation is working. The full Phase 1 definition of done remains
open until native compilation and platform-specific connectivity are verified.

## Explicitly planned

The full 200-book catalog, hosted file delivery, library/favorite UI wiring, and live
Agentic AI remain planned. Backend favorites, request tracking, and allowance enforcement
are implemented; the frontend's existing placeholders remain unchanged. No paid AI calls were made.
