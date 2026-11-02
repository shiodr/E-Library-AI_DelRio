# Phase 2 roadmap

Target: November 21, 2026. Final integration/presentation: December 5, 2026.

1. **Close deployment/device verification.** Install JDK/SDK, compile debug APK, configure
   a reachable HTTPS API, validate website cookies and Android bearer login against
   the same PostgreSQL instance. Deploy the locally verified WASIX backend package
   with production database credentials. Keep the existing static website on Wasmer.
2. **Expand licensed catalog.** Curate at least 200 unique eligible records with source,
   edition/translation, license, category, and original/properly licensed covers.
   Add a repeatable import process, deduplication, pagination proof, and review samples.
3. **Connect library actions.** Authorized favorite services/endpoints and ownership tests
   now exist in the backend. Connect the unchanged frontend library screens and sync
   them across clients. Never accept a caller-supplied
   user ID as authority. Define separate favorites/library membership only if needed.
4. **Connect file delivery.** Backend request tracking, owner-row locks, five/ten-book
   quotas, duplicates, and concurrent denial cases are implemented. Add verified licensed
   file storage/streaming and delivery handling before enabling frontend download controls.
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
