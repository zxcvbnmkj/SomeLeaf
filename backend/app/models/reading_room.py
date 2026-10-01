from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReadingRoom(Base):
    __tablename__ = "reading_rooms"
    __table_args__ = (
        CheckConstraint(
            "invite_code REGEXP '^[0-9]{6}$'",
            name="ck_rooms_invite_code_digits",
        ),
        CheckConstraint(
            "status IN ('active', 'closed')",
            name="ck_rooms_status",
        ),
    )

    id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    book_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("books.id"), nullable=False, unique=True
    )
    owner_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.id"), nullable=False, index=True
    )
    invite_code: Mapped[str] = mapped_column(String(6), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="active"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class RoomMember(Base):
    __tablename__ = "room_members"
    __table_args__ = (
        UniqueConstraint("room_id", "user_id", name="uq_room_members_room_user"),
    )

    room_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("reading_rooms.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("users.id"),
        primary_key=True,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
