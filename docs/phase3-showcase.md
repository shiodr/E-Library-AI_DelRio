# E-Library AI showcase handoff

E-Library AI shares a React frontend and FastAPI/PostgreSQL backend between
Wasmer-hosted browsers and an Android Capacitor app. The catalog includes 200
titles, with free online editions and paid listings marked separately.

## Demo sequence

1. Sign in with a test account. Search for Rust, filter by category, and open a book.
2. Open the assistant and ask “Compare beginner Rust books.” Point out the
   `search_books` and `get_book_details` steps. Ask “Only free ones” to show follow-up context.
3. On a result, select **Save to My Library**, verify the title, and choose **Confirm save**.
   Open My Library and find it under **Saved books**. These entries use the account's Favorites storage.
4. Search for **Eloquent JavaScript** and select **Download PDF**. On Android, choose
   a destination in the system document picker. Open the saved PDF, then retry
   the same title and show that the used allowance stays at one.
5. Sign in on Android with the same account and open My Library to show shared
   state. Use an existing demo admin account to show dashboard reporting and the
   create, edit, archive, and restore controls.

## Setup and evidence

- Wasmer is running frontend package `0.1.12` and the matching Phase 3 API.
  The live browser test used a real guest session, compared Rust books through
  both catalog tools, and downloaded the verified PDF twice while using one
  of five slots. The guest session was revoked after the test. The live
  Android bearer API also served a byte-identical PDF.
- November 24 local checks passed: 93 backend tests, 34 frontend tests, and
  19 desktop/mobile browser tests. One duplicate viewport matrix was skipped.
  The Wasmer backend package and signed debug APK built successfully.
- The Android emulator saved the original 2,094,513-byte PDF through the system
  picker. Its SHA-256 matched the bundled file. This check used a controlled API
  response in the emulator. Browser tests exercised the actual local API.
- Use the [main setup guide](../README.md) for PostgreSQL, Alembic, seed data, FastAPI,
  and the Vite frontend. Use a separate test database for the backend regression suite.
- Use the [Android instructions](android.md) to build the APK. The build uses
  `VITE_API_BASE_URL` for its HTTPS backend. The current APK targets the live
  Wasmer API and contains the same frontend assets as the website.
- Use the [Wasmer deployment guide](deployment.md) to build the backend package and
  deploy the API before the frontend. Run the catalog seed step to refresh the
  license description for Eloquent JavaScript. Verify health, catalog browsing, login, downloads,
  and assistant saves after activation.
- The [showcase folder](showcase/) contains three five-slide PowerPoints and the
  final technical documentation PDF. The Phase 1 deck uses the first five slides
  and speaker notes from the supplied combined presentation. The Phase 2 deck
  is the supplied repaired version.
- Phase 3 file delivery currently covers the packaged, licensed
  [Eloquent JavaScript PDF](../backend/app/data/downloads/README.md).
  The five-title guest and ten-title account limits use the same existing
  PostgreSQL transaction and ownership rules. Earlier request records are preserved.
- Catalog-mode comparison executes real database tools with a deterministic answer.
  The optional model-driven path has automated provider-response tests.
  Live model calls require an approved, configured provider and a separate live check.

## API

| Operation | Behavior |
| --- | --- |
| `POST /api/v1/assistant/chat` | Account or guest conversation. Returns real catalog results, an answer mode and the tool steps executed. |
| `POST /api/v1/favorites` | Explicitly confirmed save using the existing registered-account endpoint. |
| `GET /api/v1/favorites` | Supplies the saved books in My Library and Favorites. |
| `POST /api/v1/downloads/{book_id}/file` | Checks session, active catalog entry, file availability and quota before returning the PDF. |
| `GET /api/v1/downloads` | Returns private request history and allowance usage. |

For the classroom walkthrough, prepare an existing test reader and admin
account. Exercise the current APK on the Samsung A55 after deployment. Keep
the Docker runtime check and any professor-required live model demo separate
from the local browser and database test results.
