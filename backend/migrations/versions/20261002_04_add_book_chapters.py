"""add book chapter index

Revision ID: 20261002_04
Revises: 20261002_03
Create Date: 2026-10-02
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20261002_04"
down_revision: str | None = "20261002_03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("books", sa.Column("chapters", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("books", "chapters")
