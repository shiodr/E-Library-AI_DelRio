"""Add reviewed price offers and author submissions without rewriting catalog rows."""

import sqlalchemy as sa

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "book_prices",
        sa.Column("book_id", sa.Uuid(), sa.ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("source_amount", sa.Numeric(12, 4), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("offer_format", sa.String(80), nullable=False),
        sa.Column("source_url", sa.String(500), nullable=False),
        sa.Column("checked_on", sa.Date(), nullable=False),
        sa.Column("rate_php_per_unit", sa.Numeric(16, 8)),
        sa.Column("rate_date", sa.Date()),
        sa.Column("amount_php_minor", sa.BigInteger(), nullable=False),
        sa.CheckConstraint("amount_php_minor > 0 AND source_amount > 0", name="ck_book_prices_positive"),
    )
    op.create_table(
        "catalog_submissions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("published_book_id", sa.Uuid(), sa.ForeignKey("books.id", ondelete="SET NULL")),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("author", sa.String(255), nullable=False),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("source_url", sa.String(500), nullable=False),
        sa.Column("access_type", sa.String(20), nullable=False),
        sa.Column("proof_url", sa.String(500), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("decline_reason", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("kind IN ('book', 'tutorial', 'course', 'documentation', 'tool')", name="ck_catalog_submissions_kind"),
        sa.CheckConstraint("status IN ('pending', 'approved', 'declined', 'archived')", name="ck_catalog_submissions_status"),
        sa.CheckConstraint("access_type IN ('free_to_read', 'paid')", name="ck_catalog_submissions_access"),
    )
    op.create_index("ix_catalog_submissions_owner_id", "catalog_submissions", ["owner_id"])
    op.create_index("ix_catalog_submissions_status", "catalog_submissions", ["status"])


def downgrade():
    op.drop_table("catalog_submissions")
    op.drop_table("book_prices")
