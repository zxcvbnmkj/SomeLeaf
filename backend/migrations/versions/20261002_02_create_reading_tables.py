"""create reading and sharing tables

Revision ID: 20261002_02
Revises: 20261002_01
Create Date: 2026-10-02
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


revision: str = "20261002_02"
down_revision: str | None = "20261002_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "books",
        sa.Column(
            "id",
            mysql.BIGINT(unsigned=True),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column("owner_id", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("file_size", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("encoding", sa.String(length=32), nullable=False),
        sa.Column("normalization_version", sa.SmallInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("file_deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key", name="uq_books_storage_key"),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
        mysql_engine="InnoDB",
    )
    op.create_index("ix_books_owner_id", "books", ["owner_id"], unique=False)
    op.create_index(
        "ix_books_content_hash", "books", ["content_hash"], unique=False
    )

    op.create_table(
        "reading_rooms",
        sa.Column(
            "id",
            mysql.BIGINT(unsigned=True),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column("book_id", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("owner_id", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("invite_code", sa.String(length=6), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "invite_code REGEXP '^[0-9]{6}$'",
            name="ck_rooms_invite_code_digits",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'closed')",
            name="ck_rooms_status",
        ),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"]),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("book_id", name="uq_reading_rooms_book_id"),
        sa.UniqueConstraint("invite_code", name="uq_reading_rooms_invite_code"),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
        mysql_engine="InnoDB",
    )
    op.create_index(
        "ix_reading_rooms_owner_id",
        "reading_rooms",
        ["owner_id"],
        unique=False,
    )

    op.create_table(
        "room_members",
        sa.Column("room_id", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("user_id", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["room_id"],
            ["reading_rooms.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("room_id", "user_id"),
        sa.UniqueConstraint(
            "room_id",
            "user_id",
            name="uq_room_members_room_user",
        ),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
        mysql_engine="InnoDB",
    )

    op.create_table(
        "annotations",
        sa.Column(
            "id",
            mysql.BIGINT(unsigned=True),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column("room_id", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("user_id", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("start_offset", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("end_offset", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("quote", sa.Text(), nullable=False),
        sa.Column("context_before", sa.String(length=255), nullable=True),
        sa.Column("context_after", sa.String(length=255), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "start_offset < end_offset",
            name="ck_annotations_offsets",
        ),
        sa.ForeignKeyConstraint(
            ["room_id", "user_id"],
            ["room_members.room_id", "room_members.user_id"],
            name="fk_annotations_member",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
        mysql_engine="InnoDB",
    )
    op.create_index(
        "ix_annotations_room_offset",
        "annotations",
        ["room_id", "start_offset"],
        unique=False,
    )

    op.create_table(
        "notes",
        sa.Column(
            "id",
            mysql.BIGINT(unsigned=True),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column("room_id", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("user_id", mysql.BIGINT(unsigned=True), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("anchor_offset", mysql.BIGINT(unsigned=True), nullable=True),
        sa.Column("quote", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["room_id", "user_id"],
            ["room_members.room_id", "room_members.user_id"],
            name="fk_notes_member",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
        mysql_engine="InnoDB",
    )
    op.create_index(
        "ix_notes_room_created",
        "notes",
        ["room_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_notes_room_created", table_name="notes")
    op.drop_table("notes")
    op.drop_index("ix_annotations_room_offset", table_name="annotations")
    op.drop_table("annotations")
    op.drop_table("room_members")
    op.drop_index("ix_reading_rooms_owner_id", table_name="reading_rooms")
    op.drop_table("reading_rooms")
    op.drop_index("ix_books_content_hash", table_name="books")
    op.drop_index("ix_books_owner_id", table_name="books")
    op.drop_table("books")
