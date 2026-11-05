# Phase 1 progress — updated November 3, 2026

For the current implementation against the expanded Phase 1 checklist, use the
[November 5 completion handoff](phase1-completion.md). Administrator book management,
assistant retrieval, and tracking UI are now implemented. Overall Phase 1 remains
incomplete while live LLM generation or any final acceptance gate is unverified.
The foundation results below are historical and do not establish completion of
the later checklist.

The Phase 1 results below are the November 3 baseline. On November 4, the user
authorized the [200-title programming catalog](programming-catalog.md), now live with
60 Rust books. That update archives the original eight samples while preserving
existing library history. New verification is recorded in [testing](testing.md).

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
- Installed Apple Silicon Android Studio, JDK 21, SDK 36 and Android tools. Built the
  debug APK and installed it on an Android 16 ARM64 emulator.
- Documentation, environment examples, Compose PostgreSQL, dependency locks, and CI workflow.
- Backend favorites and download tracking, with account/session ownership, atomic five/ten-book
  quotas, idempotent repeats, and usage fields that preserve frontend compatibility.
- Backend-only HMAC session secret, legacy session/hash compatibility, root `/health`,
  deployed-website CORS, and a locally exercised WASIX package/deployment workflow.
- Live website/backend deployments with managed PostgreSQL, production migration/seed,
  and SPA fallback for direct React links and refresh. The website and installed APK use
  `https://backend-shiodr.wasmer.app/api/v1`.

## Executed proof

Backend: **38 tests passed** against PostgreSQL, including migration rollback/reapply and quota races.
Frontend: **8 tests passed**. Browser: **6 tests passed**, across desktop/mobile Chrome.
Production TypeScript/Vite build passed. **16 production website checkpoints** and
**15 installed APK checkpoints** passed. The website-created account signed into
the actual emulator APK with the same user ID, accessed the catalog, logged out,
and signed back into the website. Native keyboard, Back, loading/error/retry, and
safe-area/system-bar screenshots were checked. See [testing](testing.md) for exact
scope, initial harness/environment failures, warnings, versions, and commands.

The APK is `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`,
**4,305,221 bytes**. Signature verification and ADB installation passed. Bundled UI
and the production HTTPS API URL were inspected inside the APK.

## Remaining handoff and manual verification

- Git handoff: the user approved the reviewed Phase 1 changes for commit. The
  handoff is recorded in Git; use `git log -1` for its identifier. No remote push was made.
- Physical Android phone: not connected or tested. The emulator proves actual APK
  behavior; hardware-specific insets, keyboards, and other Android versions remain
  manual checks. Exact install/test commands are in [Android setup](android.md).
- Compose and Dockerfile execution: files supplied; Docker was not installed here.
- GitHub CI: workflow supplied; it has not run on GitHub.
- Full assistive-technology review and other browsers' privacy/cookie configurations
  remain unverified. The deployed Chrome cookie and CORS checks passed.

The functional Phase 1 foundation and emulator acceptance checks are complete.
The reviewed repository handoff is approved and recorded in Git. The restored
root `.env.example` contains placeholders only; real environment files, QA credentials,
SDK settings, APKs, and signing stores remain ignored.

## Explicitly planned

Hosted file delivery, library/favorite UI wiring, and live
Agentic AI remain planned. Backend favorites, request tracking, and allowance enforcement
are implemented; the frontend's existing placeholders remain unchanged. No paid AI calls were made.
