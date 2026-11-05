"""Add non-destructive catalog visibility and explicit source access types."""

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("books", sa.Column("access_type", sa.String(20), nullable=False, server_default="free_to_read"))
    op.add_column("books", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_check_constraint("ck_books_access_type", "books", "access_type IN ('free_to_read', 'paid')")
    op.create_index("ix_books_is_active", "books", ["is_active"])


def downgrade():
    # Keep all book rows and their existing favorite/download references.
    op.drop_index("ix_books_is_active", table_name="books")
    op.drop_constraint("ck_books_access_type", "books", type_="check")
    op.drop_column("books", "is_active")
    op.drop_column("books", "access_type")
