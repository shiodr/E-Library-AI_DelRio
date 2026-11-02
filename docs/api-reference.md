# Shared API reference

Base URL: `http://127.0.0.1:8000/api/v1` locally, reachable HTTPS in production.
Authoritative generated schemas: `/openapi.json`; interactive documentation: `/docs`.

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

`GET /books?q=darwin&category=Science&limit=12&offset=0` returns
`{"items":[...],"total":1,"limit":12,"offset":0}`. Search matches title, author,
or description case-insensitively; SQL wildcard characters are escaped. `limit` is
1–50; `offset` is nonnegative; `q` is at most 150 characters. Sorting is by title and ID.

Each book includes `id`, `title`, `author`, `category`, `description`, `cover_url`,
`source_url`, and `license_type`. Null cover URLs use original frontend placeholders.
Categories return `[{"name":"Science","count":1}, ...]`.

Errors use `{"detail":"Human-readable message"}` or FastAPI's 422 validation list.
The client displays actionable generic validation/network messages, preserves API
auth errors, and offers catalog retry. Untrusted mutation origins receive 403.
Favorite/download list responses use `{items,total,limit,offset}`. Each favorite has
`id`, `book`, and `created_at`; each download has `id`, `book`, and `downloaded_at`.
Downloads also return `allowance: {limit,used,remaining}`. POST download adds
`already_downloaded`. The limit is five distinct books per guest session and ten per
account across devices, without a scheduled reset. Repeats do not consume slots.
Exhausted allowance returns 403. New sessions do not reset registered-account history.
Guests receive 403 for favorites. Owner IDs/extra action fields are rejected with 422.

Tracking records an approved download request; file bytes are not hosted or delivered
by this endpoint. The existing frontend's future library screens are unchanged.
There is no AI endpoint or paid model call in this implementation.
