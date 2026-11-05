import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api import admin, assistant, auth, books, library
from app.core.config import get_settings
from app.core.database import engine

settings = get_settings()
app = FastAPI(title="E-Library AI API", version="0.1.0", description="Shared web and Android Phase 1 API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def browser_security(request: Request, call_next):
    origin = request.headers.get("origin")
    # CORS alone does not stop mutations. Reject untrusted browser origins before routing.
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if origin and origin not in settings.cors_origins:
            return JSONResponse(status_code=403, content={"detail": "Untrusted request origin."})
        if request.cookies.get(settings.session_cookie_name) and not origin:
            return JSONResponse(
                status_code=403, content={"detail": "Origin header required for cookie requests."}
            )
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith(("/api/v1/auth", "/api/v1/favorites", "/api/v1/downloads", "/api/v1/admin", "/api/v1/assistant")):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, error: SQLAlchemyError):
    # Avoid logging bound query parameters, credentials, or password hashes.
    logging.getLogger(__name__).error("Database operation failed: %s", type(error).__name__)
    return JSONResponse(status_code=503, content={"detail": "Library service unavailable. Please try again."})


@app.get("/", tags=["Service"])
def root():
    return {"service": "E-Library AI API", "health": "/health", "docs": "/docs"}


@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
def health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "postgresql", "phase": 1}


app.include_router(auth.router, prefix="/api/v1")
app.include_router(books.router, prefix="/api/v1")
app.include_router(library.router, prefix="/api/v1")
app.include_router(assistant.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
