from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Index, String, Text, func
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Note(Base):
    __tablename__ = "notes"
    __table_args__ = (
        ForeignKeyConstraint(
            ["room_id", "user_id"],
            ["room_members.room_id", "room_members.user_id"],
            ondelete="CASCADE",
            name="fk_notes_member",
        ),
        Index("ix_notes_room_created", "room_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    room_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    user_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    anchor_offset: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True), nullable=True
    )
    quote: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
