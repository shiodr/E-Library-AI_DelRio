# Phase 2 roadmap

Target: November 21, 2026. Final integration/presentation: December 5, 2026.

The official exam document was supplied November 20. Section V requires working modules,
an initial catalog-connected assistant, initial tracking, and an exact five-slide
presentation. This development roadmap also includes final Phase 3 work; it must not
be mistaken for the Phase 2 checklist. See the [official rubric audit](phase1-phase2-audit.md)
for phase-specific implementation and submission evidence.

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
4. **Connect file delivery for final Phase 3.** Backend request tracking, owner-row locks, five/ten-book
   quotas, duplicates, and concurrent denial cases are implemented. Add verified licensed
   file storage/streaming and delivery handling before offering actual file downloads.
   The current frontend action is explicitly a tracking demonstration.
5. **Verify generation and extend the assistant.** The shared assistant now has real
   catalog retrieval, private contextual conversations, two read-only tools, and a bounded
   OpenAI Responses integration. Live AI-led tool execution is not verified; demonstrate
   the initial assistant honestly for Phase 2. This is not an official Phase 1 blocker.
   Final Phase 3 requires comparison/recommendation, confirmation-based My Library saving,
   and at least two connected tool calls. Write tools must reuse authorized library
   services and explicit one-use confirmation. See
   [AI architecture](ai-architecture.md) for implemented and future capabilities.
6. **Harden and present.** Add deployment rate limits/monitoring, accessible device checks,
   recovery requirements if in scope, API failure exercises, and performance checks for
   the expanded catalog. Native icon/splash branding is implemented; complete signed
   release handling without committing keystores.
7. **Prepare the Phase 2 submission.** Produce exactly five slides covering Development
   Progress, Android, Web, Backend/AI, and Testing/Final Plan. Include the updated APK,
   working website, reviewed GitHub source/docs, and live module demonstration.

No paid provider request is assumed. The current configurable default is `gpt-5-mini`;
the owner chose to leave generation blocked for now. Add backend-only credentials when
ready, then verify actual `mode: "llm"` responses on both clients. Deliver each further
item as a tested end-to-end slice shared by web and Android.
