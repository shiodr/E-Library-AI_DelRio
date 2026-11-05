# Shared API reference

Administrator and assistant endpoints are implemented in the current API. See the
[Phase 1 endpoint list](phase1-completion.md#new-api-endpoints), including protected
book add/edit/archive/restore and `/assistant/chat`. Assistant responses explicitly
distinguish `llm`, `catalog_only`, and `provider_error`; configuration alone does not
prove a working provider call. Download responses identify `event_type: tracking_demo`.

Base URL: `http://127.0.0.1:8000/api/v1` locally, reachable HTTPS in production.
Authoritative generated schemas: `/openapi.json`; interactive documentation: `/docs`.
`GET /` returns HTTP 200 with service information and links to `/health` and `/docs`.

| Method and endpoint | Access | Behavior |
| --- | --- | --- |
| `POST /auth/register` | Public | Creates account and session; 201; duplicate email 409 |
| `POST /auth/login` | Public | Verifies credentials and creates session; 200; invalid credentials 401 |
| `POST /auth/guest` | Public | Creates distinct database guest session; 201 |
| `GET /auth/me` | Valid user/guest session | Profile and current allowance; missing/expired/revoked session 401 |
| `POST /auth/logout` | Valid user/guest session | Revokes current session and deletes cookie; 204 |
| `GET /health` | Public | Database connectivity check; 200 or generic 503 |
| `GET /books` | Public | Real catalog, bounded pagination and optional filters |
| `GET /books/{uuid}` | Public | Book metadata, license, source; missing book 404 |
| `GET /categories` | Public | Categories and database counts |
| `GET /favorites` | Registered user | Paginated own saved favorites |
| `POST /favorites` | Registered user | Body `{book_id}`; 201 new, 200 existing |
| `DELETE /favorites/{book_id}` | Registered user | Idempotent removal of own favorite; 204 |
| `GET /downloads` | Valid user/guest session | Own paginated history and allowance |
| `POST /downloads` | Valid user/guest session | Body `{book_id}`; atomically enforce quota, 201 new or 200 repeated |
| `GET /assistant/status` | Valid user/guest session | Provider configuration status, not a live-provider health check |
| `POST /assistant/chat` | Valid user/guest session | Catalog-backed conversation with explicit response mode |
| `GET /admin/overview` | Administrator | Real counts, categories, and recent activity |
| `GET /admin/books` | Administrator | Paginated active/archived search and filtering |
| `POST /admin/books` | Administrator | Create a validated book record |
| `PUT /admin/books/{book_id}` | Administrator | Update metadata while retaining the book ID |
| `POST /admin/books/{book_id}/archive` | Administrator | Hide public availability and preserve history |
| `POST /admin/books/{book_id}/restore` | Administrator | Restore public availability |

`GET /health` is also available outside the `/api/v1` prefix for deployment probes.

## Authentication requests

Registration JSON:

```json
{"full_name":"Alex Reader","email":"alex@example.com","password":"use-your-own-long-passphrase","client":"web"}
```

`full_name`: trimmed, 2–100 characters. Email: valid address, at most 254 characters,
normalized to lowercase. Registration password: 12–128 characters. Login accepts
the same email/password and `client` without `full_name`. Extra fields are rejected
with 422; roles are assigned by the backend. Confirm password belongs to frontend
validation and is never stored or transmitted. Guest JSON is `{"client":"web"}`.
Use `client: "android"` for native authentication; default is `web`.

Auth responses contain `session_type`, `expires_at`, `user` (null for guests),
`planned_download_limit` (5/10, retained for compatibility), `download_limit`,
`downloads_used`, `downloads_remaining`, `access_token`, and `token_type`. For web,
both token fields are null and the backend sets an HttpOnly cookie. Browser requests
use `credentials: "include"`. For Android, the response contains a bearer token and
sets no cookie. Send `Authorization: Bearer <token>` for protected requests.
`GET /auth/me` excludes token fields entirely.

Both methods verify the same server-side session table. Clients cannot select their
identity, role, or allowance. An explicit invalid Authorization header never falls
back to a cookie. Logout affects the current session only. Cookie mutations require
a configured Origin; native bearer requests do not need that header, but any supplied
Origin must still be trusted.

## Catalog

`GET /books?category=Rust&limit=12&offset=0` returns
`{"items":[...],"total":60,"limit":12,"offset":0}`. Search matches title, author,
or description case-insensitively; SQL wildcard characters are escaped. `limit` is
1–50; `offset` is nonnegative; `q` is at most 150 characters. Rust is sorted first,
then title and ID. The unfiltered public catalog contains 200 programming titles.

Each book includes `id`, `title`, `author`, `category`, `description`, `cover_url`,
`source_url`, `license_type`, `access_type` (`free_to_read` or `paid`), and `is_active`.
Null cover URLs use original frontend placeholders. Categories return
`[{"name":"Rust","count":60}, ...]`, with Rust first. Archived records are excluded
from public listing/detail/category routes but retained in existing private history.

Errors use `{"detail":"Human-readable message"}` or FastAPI's 422 validation list.
The client displays actionable generic validation/network messages, preserves API
auth errors, and offers catalog retry. Untrusted mutation origins receive 403.
Favorite/download list responses use `{items,total,limit,offset}`. Each favorite has
`id`, `book`, and `created_at`; each download has `id`, `book`, `downloaded_at`,
and `event_type: "tracking_demo"`.
Downloads also return `allowance: {limit,used,remaining}`. POST download adds
`already_downloaded`. The limit is five distinct books per guest session and ten per
account across devices, without a scheduled reset. Repeats do not consume slots.
Exhausted allowance returns 403. New sessions do not reset registered-account history.
New download requests for paid listings return 403 without consuming allowance.
Guests receive 403 for favorites. Owner IDs/extra action fields are rejected with 422.

Tracking records an approved request; file bytes are not hosted or delivered by this
endpoint. The shared frontend exposes explicitly labeled tracking controls and private
history. Favorites uses the same existing registered-account service.

## Assistant and administration

Chat accepts `{"message":"Find Rust books."}` and an optional owner-bound
`conversation_id` UUID for a follow-up. It returns `conversation_id`, `answer`, real
`books`, `mode`, `generation_available`, and nullable `model`. Modes are `llm`,
`catalog_only`, or `provider_error`; the latter two explicitly disclose retrieval
without successful generation. Shared per-owner/global limits return 429 with a retry
header. Another owner's conversation returns 404. No live provider call is claimed
while generation remains blocked.

All administrator endpoints reload the current account role from PostgreSQL. Readers
and guests receive 403; missing/expired/revoked sessions receive 401. Administrator
registration is not public. Book updates preserve historical references, archive does
not delete rows, and the bootstrap seed respects administrator-managed records.
See the [handoff](phase1-completion.md) for provisioning, field validation, deployment,
and demonstration commands; `/openapi.json` defines the full request/response schemas.
