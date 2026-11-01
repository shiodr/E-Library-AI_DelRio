# Phase 1 presentation — exactly five slides

## Slide 1 — Project Overview

**E-Library AI:** an integrated web and Android digital library for IPT102.

- One reading interface on two platforms.
- Users can register/sign in or explore with a real guest session.
- Phase 1 establishes the foundation; Agentic AI is planned for Phase 2.
- Deadlines: November 7, November 21, and December 5, 2026.

Speaker notes: “My goal is to make the library accessible through a browser and an
Android app while keeping accounts and book information in one shared system.”

## Slide 2 — Technology Stack

- React, TypeScript, Vite, Tailwind CSS, React Router, Lucide, and Motion.
- Capacitor's official Android package reuses the React build.
- Python/FastAPI, Pydantic, SQLAlchemy, Alembic, and PostgreSQL.
- Argon2id password hashing and database-backed sessions.
- Wasmer deployment preparation; OpenAI tool calling is a future integration.

Speaker notes: “Capacitor packages the same frontend into Android. I maintain one
set of screens and one API contract instead of two independent applications.”

## Slide 3 — System Architecture

Show the diagram in [architecture.md](architecture.md).

- Website and Android both send HTTPS JSON requests to FastAPI.
- FastAPI validates requests and reads/writes PostgreSQL through SQLAlchemy.
- Browser sessions use HttpOnly cookies; Android uses a token held in memory.
- PostgreSQL contains users, sessions, books, favorites, and downloads tables.

Speaker notes: “When I register on the website, the backend creates a database user.
Android logs into that same backend with the same credentials, so it receives the
same user ID. The phone does not connect directly to PostgreSQL.”

## Slide 4 — Authentication and Initial Interfaces

- Demonstrate welcome, registration validation, login, and guest entry.
- Show personalized/guest dashboard, catalog search, categories, and book license preview.
- Explain expiration and server-side logout revocation.
- Show My Library/Favorites empty states and clearly disabled Phase 2 AI composer.

Speaker notes: “These forms call the real API. Passwords are hashed, sessions expire,
and logout revokes the database session. The eight starter books come from PostgreSQL.
The assistant preview does not generate fake responses.”

## Slide 5 — Development Progress

- Working frontend/backend and PostgreSQL migration/seed.
- 16 backend tests, 8 frontend tests, and 6 desktop/mobile browser tests passed.
- Android project generated; APK compilation blocked by missing local JDK/SDK.
- Wasmer configuration prepared; its locked-dependency compatibility gate is unresolved.
- Next: physical-device build, reachable HTTPS API, catalog expansion, authorized
  saving/download limits, and embedded AI tools.

Speaker notes: “The shared account contract has been verified through real browser
registration and Android-style API login. I still need to compile and test the APK
on a phone. I separate completed work from planned features in the progress document.”
