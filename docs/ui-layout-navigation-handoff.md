# UI layout, navigation, and branding handoff

Verified November 6, 2026 (Asia/Manila). Changes are local and uncommitted. Deployment requires the owner's confirmation.

Follow-up: the web-only cookie transport failure was subsequently reproduced and fixed.
See [Web cookie session fix](web-cookie-session-fix.md) for the cause, HTTPS regression
results, and required backend rollout. The earlier limitations below describe the initial UI handoff.

## Navigation diagnosis and fix

The route guard already accepted valid guest profiles. The failure chain was in session invalidation: `lib/api.ts` dispatched `session-expired` for any feature endpoint returning HTTP 401; `AuthContext` immediately removed the profile and native credential; `ProtectedRoute` then redirected to login. A feature response alone was treated as proof that authentication had expired. Guest Favorites also fetched `/downloads` even though its guest state needed no history, exposing navigation to an unnecessary failure.

Feature 401 responses now request an authoritative `/auth/me` check. Concurrent checks are coalesced, stale requests cannot invalidate a newer session, and checks cannot cancel an in-progress login. A valid profile remains signed in while the feature displays its own error. A network failure during verification retains the session and credentials. HTTP 403 remains a permission error within the page.

A confirmed expired guest session displays an in-page recovery screen at the same URL, with Continue as Guest, Sign in, and Create account actions. Starting another guest session requires that explicit action; guest limits are never silently reset. Confirmed registered-session expiry still requires login and includes an explanation. Initial session loading and Android credential restoration still finish before protected content renders.

Guest Favorites has no account/history request and offers Sign in, Create account, and Continue exploring. Guest My Library describes account benefits while retaining access to that guest session's actual tracking history. Assistant permission denials preserve the interface, explain restricted access, offer account links, and disable unavailable requests. Ordinary guests can still use catalog retrieval when permitted by the backend.

This establishes the source-level redirect mechanism and fixes it. The original deployed feature 401's transport cause was not captured. Cross-origin cookie blocking, expired credentials, and intermittent service responses are not interchangeable causes. No claim is made that browser privacy restrictions were changed. Web credentials remain HttpOnly cookies; native credentials remain in the Android Keystore-backed store.

## Layout and interaction changes

- `src/modern.css` contains the shared indigo/navy tokens, responsive spacing, auth layout, detail cards, navigation, guest states, and reduced-motion overrides. The existing design layer is retained in `styles.css`.
- `pages/AuthPage.tsx` uses a balanced desktop composition with a reading visual and a padded 440px maximum-width form. Tablet/phone forms use a single column, maintain content insets, and retain field validation and password visibility.
- `components/AppLayout.tsx` aligns the shell/header, preserves accessible collapsed navigation names, updates Library/Heart icons, and uses immediate route entrance animation without waiting for outgoing pages. Administrator navigation remains conditional. Its mobile access link replaces the desktop sidebar entry.
- The assistant shortcut sits inside the desktop sidebar area, clear of book actions. Mobile uses the existing Assistant navigation item rather than a second floating shortcut.
- `pages/BookDetail.tsx` adds a padded cover presentation, readable description and metadata, source/access card, permission-aware actions, and related books fetched from the real category endpoint. Copyright terms and the file-delivery limitation remain visible. There is no pretend file download.
- `pages/Library.tsx` adds guest states and resets pagination when switching between library modes. `hooks/useCatalog.ts` supports intentionally disabled requests.
- `components/ui.tsx` shares the new mark and animated book cards, including access terms in accessible names. Long cover titles fit narrow cards.

## Branding assets

`public/icon.svg` is the canonical rounded indigo book-and-sparkle mark. The website logo, favicon, manifest, 192/512px icons, maskable icon, and Apple touch icon use it. Ownership attribution remains `by shio del rio`.

Android has matching legacy/round launcher PNGs for all five densities, adaptive vector foreground/background resources, and branded legacy/Android 12 splash resources. Existing application ID and package name remain `com.elibraryai.app`. The web manifest does not add offline caching or claim offline book delivery.

Regenerate the raster assets with installed Chrome or Playwright Chromium:

```bash
node apps/web/scripts/generate-brand-assets.mjs
```

Set `BRAND_CHROME_PATH` when Chrome is installed elsewhere. Generated assets are checked-in inputs; production builds do not need to run this generator.

## Verification

| Check | Result |
| --- | --- |
| Frontend unit/interface tests | 34 passed, including feature 401, permission 403, expiry recovery, stale login response, verification network failure, cookie restoration, and native credential persistence |
| PostgreSQL backend tests | 87 passed against isolated local `elibrary_test`; guest/account ownership, administrator authorization, and five/ten-book limits remain enforced |
| Complete desktop/mobile E2E suite | 17 passed; one duplicate viewport matrix intentionally skipped in the mobile project |
| Final focused visual/admin rerun | 2 passed after cover typography and sidebar assertions were added |
| Responsive matrix | Login, registration, details, catalog, guest Favorites, My Library, Assistant, and administrator dashboard checked at 1440, 1024, 768, 390, and 360px |
| Themes | Light/dark layout checks; no document horizontal overflow; auth controls retain at least 12px inner insets |
| Administrator regression | Local trusted-role provisioning, real add/edit/archive/restore, current role enforcement, and metric checks passed |
| Production build | TypeScript and Vite passed; favicon, manifest, and generated icons included in `dist` |
| Android build and signature | Debug APK built; `apksigner verify` passed |
| Android emulator | Final APK installed; launcher icon, app launch, login layout, and Back-to-exit observed on API 36 ARM64; see limitations below |
| Review | Cavecrew navigation review findings fixed and re-reviewed without remaining material findings |
| Static checks | Generator syntax, SVG/XML parsing, and `git diff --check` passed |

Browser tests used FastAPI and the real 200-book catalog in a separate local `elibrary_ui_test` PostgreSQL database. Only the explicitly injected 401/403 cases substituted feature responses. No production database records were changed, and no paid AI requests were made. Generated evidence is ignored under `.local/ui-layout-qa`.

The first backend command ran from the repository root and failed two subprocess imports; running the documented command from `backend` passed all 87 tests. One focused browser invocation lost its flags through the root npm wrapper and selected no tests; the direct workspace command passed. The emulator initially displayed a System UI nonresponsive dialog while Chrome and Gradle ran concurrently; it recovered and displayed the app. These harness/environment failures are not counted as passed application checks.

Current APK: `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`, 4,596,607 bytes.

SHA-256: `d9db57e14dfd4a1bda38d4c511da3fdf8145486e9f083c97920c9270244ad5c2`.

## Commands and remaining checks

From the repository root:

```bash
npm test
npm run build
npm run test:e2e
npm run android:apk
```

E2E tests require a locally configured backend and PostgreSQL, as described in [testing.md](testing.md). They create accounts and book-management test records, so use a dedicated local test database. To pass Playwright flags, invoke the workspace directly:

```bash
npm run test:e2e --workspace apps/web -- --project desktop
```

Backend tests must run from `backend` with `TEST_DATABASE_URL` pointing to a dedicated database ending in `_test`:

```bash
cd backend
.venv/bin/python -m pytest -q
```

No lint script is configured in the frontend; TypeScript, test, build, and whitespace checks were used. Physical Samsung login persistence, full native authenticated navigation/keyboard behavior, other browser cookie policies, screen-reader operation, and live Wasmer behavior after deployment still need verification. Native secure-storage tests pass, but emulator layout inspection is not evidence of an authenticated physical-phone run. Live LLM generation remains blocked as previously requested. No backend code, database schema, application identifiers, authentication secrets, or deployment targets were changed.

The pre-existing `apps/web/wasmer.toml` version edit was preserved. Nothing was committed or deployed. Review this report and the screenshots before approving the commit/deployment.
