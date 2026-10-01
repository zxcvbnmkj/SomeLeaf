from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Annotation(Base):
    __tablename__ = "annotations"
    __table_args__ = (
        ForeignKeyConstraint(
            ["room_id", "user_id"],
            ["room_members.room_id", "room_members.user_id"],
            ondelete="CASCADE",
            name="fk_annotations_member",
        ),
        CheckConstraint("start_offset < end_offset", name="ck_annotations_offsets"),
        Index("ix_annotations_room_offset", "room_id", "start_offset"),
    )

    id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    room_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    user_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    start_offset: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    end_offset: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    quote: Mapped[str] = mapped_column(Text, nullable=False)
    context_before: Mapped[str | None] = mapped_column(String(255), nullable=True)
    context_after: Mapped[str | None] = mapped_column(String(255), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
