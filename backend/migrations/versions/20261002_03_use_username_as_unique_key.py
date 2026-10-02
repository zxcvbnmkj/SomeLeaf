"""use username as the unique user key

Revision ID: 20261002_03
Revises: 20261002_02
Create Date: 2026-10-02
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20261002_03"
down_revision: str | None = "20261002_02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "uq_users_username_normalized",
        "users",
        type_="unique",
    )
    op.drop_column("users", "username_normalized")
    op.create_unique_constraint("uq_users_username", "users", ["username"])


def downgrade() -> None:
    op.drop_constraint("uq_users_username", "users", type_="unique")
    op.add_column(
        "users",
        sa.Column("username_normalized", sa.String(length=64), nullable=True),
    )
    op.execute(
        sa.text("UPDATE users SET username_normalized = LOWER(TRIM(username))")
    )
    op.alter_column(
        "users",
        "username_normalized",
        existing_type=sa.String(length=64),
        nullable=False,
    )
    op.create_unique_constraint(
        "uq_users_username_normalized",
        "users",
        ["username_normalized"],
    )
