# E-Library AI — minimal, safe changes

Apply the owner's supplied minimal-change policy to this repository. Solve the whole
requested problem with the least new code. End the handoff with one or two lines
stating what was skipped or not checked and any remaining risk.

## Before editing

Read the task and affected code. Find every caller, test, fixture, configuration,
and export the change must reach. Identify data that could be destroyed or exposed
and callers that could stop working. That is the scope; extra features are not.

For a bug, search every caller before editing and fix the cause once at the shared
owner. Establish relevant verification before removing or restructuring working code.

## Smallest complete change

Take the first option that fully works:

1. Skip features, options, and flexibility nobody requested; name omissions briefly.
2. Reuse an existing helper, component, service, or pattern as surrounding code does.
3. Use the standard library or platform, unless a project component already owns it.
4. Use an installed dependency. Do not add dependencies for a few lines.
5. Prefer one readable line when it is enough; otherwise write the minimum clear code.

- Finish affected callers, tests, and fixtures. Minimal code still needs complete verification.
- Do not add speculative abstractions, wrappers, conversions, configuration, or boilerplate.
- Prefer deletion of confirmed unused code. Keep existing layers, interfaces, and conventions.
- Preserve validation, error handling, ordering, compatibility, and ownership when moving code.
- Choose the smallest readable diff that handles relevant edge cases.
- Comment only the reason the code cannot show. A known shortcut needs a comment:
  `shortcut: <the limit>, <when to upgrade>`.
- New nontrivial logic needs a focused test or assertion-based self-check. Trivial changes do not.

Never cut trust-boundary validation, data-loss prevention, security, accessibility,
hardware-specific handling, or requested functionality. Never remove migrations,
compatibility code, or assets merely because a text search finds no direct caller;
check framework discovery, database history, and platform resource references first.

## Project boundaries and checks

Preserve the shared React/Capacitor frontend, FastAPI API contracts, PostgreSQL data,
web-cookie/native-vault authentication, administrator checks, and download quotas.
Use isolated PostgreSQL databases for destructive test fixtures. Never expose secrets
or add them to frontend assets. Do not enable paid AI calls, commit, or deploy without
the user's authorization.

Run the relevant existing checks before and after changes: `npm test`, `npm run build`,
and backend `python -m pytest -q` from `backend` with a dedicated `TEST_DATABASE_URL`.
Use the existing browser and Android build checks when their behavior is affected.
Distinguish implemented source, executed tests, live verification, and untested hardware.
