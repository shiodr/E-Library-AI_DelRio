import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('reader', 'admin')", name="ck_users_role"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="reader", server_default="reader")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        CheckConstraint(
            "(session_type = 'guest' AND user_id IS NULL) OR (session_type = 'user' AND user_id IS NOT NULL)",
            name="ck_sessions_identity",
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    session_type: Mapped[str] = mapped_column(String(10))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Book(Base):
    __tablename__ = "books"
    __table_args__ = (
        UniqueConstraint("title", "author", name="uq_books_title_author"),
        CheckConstraint("access_type IN ('free_to_read', 'paid')", name="ck_books_access_type"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), index=True)
    author: Mapped[str] = mapped_column(String(255), index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    description: Mapped[str] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(String(500))
    source_url: Mapped[str] = mapped_column(String(500), unique=True)
    license_type: Mapped[str] = mapped_column(String(255))
    access_type: Mapped[str] = mapped_column(String(20), default="free_to_read", server_default="free_to_read")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", index=True)
    is_managed_by_admin: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    seed_source_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "book_id", name="uq_favorites_user_book"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Download(Base):
    __tablename__ = "downloads"
    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL AND guest_session_id IS NULL) OR "
            "(user_id IS NULL AND guest_session_id IS NOT NULL)",
            name="ck_downloads_owner",
        ),
        UniqueConstraint("user_id", "book_id", name="uq_downloads_user_book"),
        UniqueConstraint("guest_session_id", "book_id", name="uq_downloads_guest_book"),
        Index("ix_downloads_guest_session_id", "guest_session_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    guest_session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
    book_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("books.id", ondelete="RESTRICT"), index=True)
    downloaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AssistantConversation(Base):
    __tablename__ = "assistant_conversations"
    __table_args__ = (CheckConstraint(
        "(user_id IS NOT NULL AND guest_session_id IS NULL) OR "
        "(user_id IS NULL AND guest_session_id IS NOT NULL)", name="ck_assistant_conversations_owner"
    ),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    guest_session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    history: Mapped[list[dict]] = mapped_column(JSONB, default=list, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AssistantRateLimit(Base):
    __tablename__ = "assistant_rate_limits"
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    hits: Mapped[int] = mapped_column(Integer)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
