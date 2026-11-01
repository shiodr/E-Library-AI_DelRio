# Phase 2 roadmap

Target: November 21, 2026. Final integration/presentation: December 5, 2026.

1. **Close deployment/device verification.** Install JDK/SDK, compile debug APK, configure
   a reachable HTTPS API, validate website cookies and Android bearer login against
   the same PostgreSQL instance. Resolve WASIX package support or host the Python API
   on a standard runtime. Keep the static website deployable on Wasmer.
2. **Expand licensed catalog.** Curate at least 200 unique eligible records with source,
   edition/translation, license, category, and original/properly licensed covers.
   Add a repeatable import process, deduplication, pagination proof, and review samples.
3. **Implement library actions.** Add authorized saved-book/favorite services and endpoints,
   sync them across clients, and test ownership isolation. Never accept a caller-supplied
   user ID as authority. Define separate favorites/library membership only if needed.
4. **Implement downloads.** Use backend transactions and owner-row locks for five distinct
   guest books per session and ten per account. Verify license eligibility, duplicate
   idempotency, concurrency, and denial responses before enabling download controls.
5. **Add embedded Agentic AI.** Implement the five tools in [AI architecture](ai-architecture.md),
   a bounded server-side conversation loop, contextual follow-ups, real catalog grounding,
   and explicit one-use confirmation for saves. Demonstrate two connected tool calls.
6. **Harden and present.** Add deployment rate limits/monitoring, accessible device checks,
   recovery requirements if in scope, API failure exercises, and performance checks for
   the expanded catalog. Replace native icon/splash placeholders and document signed
   release handling without committing keystores.

No paid AI API or cloud resource is assumed. Choose a supported model and set backend-only
credentials only when that phase is authorized and an account is available. Deliver
each item as a tested end-to-end slice shared by web and Android.
