# Web-only session loss: cross-site cookie fix

Verified November 6, 2026. This backend correction supplements the earlier navigation/UI work.

## Production deployment

The owner approved deployment, and the existing `shiodr/backend` application
(`da_KE4I8tXUN7Wz`) was updated on November 6, 2026. Wasmer reported deployment
complete at `https://backend-shiodr.wasmer.app`. New version: `v6`
(`dav_nYYILt9uL9ed`). The website and Android applications were not redeployed.

Read-only production checks passed: `/health` returned HTTP 200 with PostgreSQL
healthy; `/api/v1/books?limit=1` returned HTTP 200 and 200 active titles;
anonymous `/api/v1/auth/me` correctly returned HTTP 401. All three responses allowed
the exact website origin with credentialed CORS. No migration, seed, production
account/session creation, secret rotation, or paid AI call was performed.

The real authenticated browser flows passed locally with third-party cookies blocked.
Live authenticated navigation is left for the owner's next sign-in, preserving the
request to avoid changing production database records during verification.

## Cause and reproduction

`elibrary-ai.wasmer.app` and `backend-shiodr.wasmer.app` are separate sites because
`wasmer.app` is on the [Public Suffix List](https://publicsuffix.org/list/public_suffix_list.dat).
The web client authenticates with an HttpOnly cookie; Android authenticates with a
Keystore-backed bearer token. The old web cookie used `Secure; SameSite=None` but
lacked `Partitioned`. Browsers that block unpartitioned third-party cookies discarded
it. The authentication POST still returned a profile, allowing public catalog pages
to appear signed in. My Library and Assistant then required a session, returned 401,
and the authoritative `/auth/me` check also returned 401. The earlier redirect fix
correctly detected missing credentials but did not fix their transport.

The failure was reproduced with real HTTPS and Chrome third-party-cookie restriction
enabled. Without `Partitioned`, the cookie was not stored or sent. With `Partitioned`,
it was retained under the frontend site's partition and sent to the API. These results
match [CHIPS behavior](https://privacysandbox.google.com/cookies/chips). An initial
intercepted-response probe did not enforce the same cookie behavior, so the final
regression uses actual loopback HTTPS connections and the real FastAPI application.
No production requests or database changes were needed to reproduce the failure.

## Correction

- `backend/app/services/auth.py` adds `Partitioned` automatically only for the existing
  secure, `SameSite=None` configuration. HttpOnly, host-only scope, `/api/v1` path,
  expiration, server revocation, hashing, and ownership checks are preserved.
- Issuing a web session deletes its legacy unpartitioned cookie before setting the
  partitioned cookie, preventing ambiguous same-name cookies in permissive browsers.
- Logout uses the shared helper to expire both forms and revokes the server session.
- Python 3.13/WASIX emits the standard attribute on Starlette's escaped cookie header;
  it does not call Starlette's Python 3.14-only `partitioned` option or modify global
  cookie parsing behavior.
- Local HTTP/Lax cookies and Android bearer authentication retain their existing behavior.

No schema migration, secret rotation, frontend credential storage, or Android rebuild
is required. Existing production cookie settings already enable this behavior once
the backend is rebuilt and deployed.

## Verification

Backend PostgreSQL tests: **91 passed**. Added coverage checks guest, registration,
login, host-only/HttpOnly/Secure/Partitioned attributes, legacy cleanup, logout
revocation, and local/native compatibility. Existing authorization and quota tests pass.

Actual HTTPS browser regressions: **3 passed** with ordinary third-party cookies blocked:

1. Removing `Partitioned` reproduces the reported guest-session-ended screen.
2. The patched guest session survives My Library, real catalog Assistant requests,
   browser refresh, and logout; the cookie remains inaccessible to JavaScript.
3. Registered-user registration and login both survive private navigation and refresh;
   logout clears access to protected routes.

The browser test uses the real compiled frontend, a loopback HTTPS proxy, and a local
FastAPI server with the real PostgreSQL catalog. Chrome maps the two Wasmer hostnames
to loopback; the tests do not contact either deployed application. The configuration
rejects a database URL unless it targets loopback and its database name ends in `_test`.
The normal frontend suite also passed all 34 tests, and the TypeScript/Vite production
build passed. The updated WASIX package was prepared with the existing wheel cache;
`wasmer package build --check .` passed. This was a local build check, not a deployment.

OpenSSL generates a temporary test certificate; browser certificate validation is
relaxed only in this test configuration. Production TLS settings are unchanged.

Run after initializing a dedicated local catalog test database:

```bash
DATABASE_URL=postgresql+pg8000://elibrary@127.0.0.1:55432/elibrary_ui_test \
  npm run test:cross-site --workspace apps/web
```

The script builds the frontend before testing. Test code is in
`apps/web/cross-site-e2e/session.spec.ts`; configuration is in
`apps/web/playwright.cross-site.config.ts`. Ruff and whitespace checks pass.

## Rollout

The approved rollout above used the established WASIX build and deployment flow.
For future approved deployments, start from the repository root:

```bash
cd backend
.venv/bin/python scripts/build_wasmer.py
wasmer package build --check .
wasmer deploy --env-file .env.production
```

For an already-resolved local WASIX wheel cache, the build step may instead use
`--packages ../.local/wasix-backend-packages`. Keep the current application ID, managed
database, `SESSION_TOKEN_SECRET`, `SESSION_COOKIE_SECURE=true`, and
`SESSION_COOKIE_SAMESITE=none`. Do not create a replacement database or run migrations
for this cookie-only change. Website-only deployment cannot apply backend cookie headers.

Start a guest session or sign in once on the website after refreshing it. Verify My Library,
Assistant, refresh, and logout with third-party cookies blocked. Modern Chrome was tested locally;
Safari/Firefox, older browsers, and the owner's actual browser remain separate checks.
Older browsers without CHIPS require same-site hosting or a same-origin proxy rather
than weakening cookie security. Live AI generation remains blocked as requested.
