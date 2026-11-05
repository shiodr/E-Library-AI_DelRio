# Phase 2 roadmap

Target: November 21, 2026. Final integration/presentation: December 5, 2026.

1. **Finish hardware verification.** The toolchain, debug APK, deployed HTTPS API,
   managed PostgreSQL, browser cookies, and actual emulator shared-account flow are
   verified. Physical-phone and other browser/device configurations remain manual checks.
2. **Maintain the programming catalog.** The 200-title Rust-focused catalog is implemented:
   60 Rust books, 34 free online editions, and 166 paid publisher listings. Keep source/access
   reviews current and preserve stable IDs/history during updates. See [all titles](programming-catalog.md).
3. **Extend shared library actions when required.** Favorites and My Library tracking
   history now work in both clients through the existing authorized API. Preserve their
   ownership and synchronization tests. Define another kind of library membership only
   if product requirements need it.
4. **Connect file delivery.** Backend request tracking, owner-row locks, five/ten-book
   quotas, duplicates, and concurrent denial cases are implemented. Add verified licensed
   file storage/streaming and delivery handling before offering actual file downloads.
   The current frontend action is explicitly a tracking demonstration.
5. **Verify generation and extend the assistant.** The shared assistant now has real
   catalog retrieval, private contextual conversations, two read-only tools, and a bounded
   OpenAI Responses integration. Live generation remains a Phase 1 blocker until backend
   credentials are configured and both clients pass real provider checks. Later write tools
   must reuse authorized library services and explicit one-use confirmation. See
   [AI architecture](ai-architecture.md) for implemented and future capabilities.
6. **Harden and present.** Add deployment rate limits/monitoring, accessible device checks,
   recovery requirements if in scope, API failure exercises, and performance checks for
   the expanded catalog. Replace native icon/splash placeholders and document signed
   release handling without committing keystores.

No paid provider request is assumed. The current configurable default is `gpt-5-mini`;
the owner chose to leave generation blocked for now. Add backend-only credentials when
ready, then verify actual `mode: "llm"` responses on both clients. Deliver each further
item as a tested end-to-end slice shared by web and Android.
