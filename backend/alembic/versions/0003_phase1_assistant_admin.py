"""Persist private assistant context/rate limits and preserve administrator catalog edits."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("books", sa.Column("is_managed_by_admin", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("books", sa.Column("seed_source_url", sa.String(500), nullable=True))
    op.execute("UPDATE books SET seed_source_url = source_url")
    op.create_table(
        "assistant_conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("guest_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("history", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("(user_id IS NOT NULL AND guest_session_id IS NULL) OR (user_id IS NULL AND guest_session_id IS NOT NULL)", name="ck_assistant_conversations_owner"),
    )
    op.create_index("ix_assistant_conversations_user_id", "assistant_conversations", ["user_id"])
    op.create_index("ix_assistant_conversations_guest_session_id", "assistant_conversations", ["guest_session_id"])
    op.create_table(
        "assistant_rate_limits",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("hits", sa.Integer(), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    # Catalog and user/download history survive; assistant conversations are removed only on explicit rollback.
    op.drop_table("assistant_rate_limits")
    op.drop_index("ix_assistant_conversations_guest_session_id", table_name="assistant_conversations")
    op.drop_index("ix_assistant_conversations_user_id", table_name="assistant_conversations")
    op.drop_table("assistant_conversations")
    op.drop_column("books", "seed_source_url")
    op.drop_column("books", "is_managed_by_admin")
