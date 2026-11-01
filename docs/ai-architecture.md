# Embedded Agentic AI architecture — planned for Phase 2

Phase 1 contains a disabled chat composer and honest feature preview. There is no
OpenAI SDK dependency, API key, paid request, external chatbot, or generated answer.
The same future chat interface will be embedded in the web app and bundled Android app.

The planned FastAPI orchestration uses the Responses API function-calling pattern:
send tool schemas, validate requested arguments, execute an allowlisted backend
function, and return its result to the model. Tool execution stays under application
control. This follows [official OpenAI function-calling documentation](https://developers.openai.com/api/docs/guides/function-calling),
checked November 1, 2026. Select and evaluate a supported model during Phase 2;
no model, pricing, or paid account availability is assumed here.

## Planned tools

| Tool | Validated inputs | Backend operation |
| --- | --- | --- |
| `search_books` | Query, optional category, bounded limit | Search PostgreSQL and return real IDs, descriptions, and licenses |
| `get_book_details` | Book UUID | Retrieve one real catalog record or a structured not-found result |
| `compare_books` | 2–4 book UUIDs | Load records, return grounded comparison attributes and source references |
| `recommend_books` | User request, optional category and exclusions | Find eligible real candidates; explain fit using their catalog metadata |
| `save_book_to_library` | Book UUID and server-issued confirmation reference | Authorize user, verify confirmation, perform idempotent save transaction |

Schemas will reject extra fields and cap query/result sizes. The model cannot supply
SQL, a user ID, a role, an arbitrary URL, or executable code. Read tools reuse catalog
services; write tools reuse the same ownership and transactions as normal app actions.
The server adds authenticated identity out-of-band after verifying the session.

## Connected-tool demonstration planned

For “Compare Wells' science fiction and suggest one,” first call `search_books`
against the seeded database. Use the returned UUIDs for *The Time Machine* and
*The War of the Worlds* as inputs to `compare_books` or `get_book_details`. Return
the real records and their source references to the model before it explains a choice.
This provides at least two connected calls with actual catalog data. UUIDs are read
at runtime; demonstration IDs or successful tool outputs are never hardcoded.

For “Save that one,” return a confirmation card containing the selected real book.
The backend creates a short-lived, one-use confirmation reference bound to session,
user, action, and book. Only an explicit user click confirms it. Then validate identity
and reference again, consume it atomically, and save through the authorized library
service. Model text saying “confirmed” is not authorization. Guests must register
before persistent saves. Revoked/expired sessions fail even after earlier consent.

## Conversation and trust

Store bounded conversation context server-side, keyed to the validated session/user.
Resolve “that one” from prior tool results while verifying the referenced book still
exists. Treat catalog descriptions and user messages as data, not tool instructions.
Never send password hashes, session tokens, database credentials, or unnecessary
account information to the model. Keep the OpenAI key only in backend secrets.

Cap tool turns, output sizes, request duration, and per-account spending. Handle
provider failure without fabricated answers. Test ambiguous follow-ups, absent books,
cross-account access, guest writes, prompt injection, denied/expired confirmations,
duplicate saves, and provider timeouts before enabling the composer.
