from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, SmallInteger, String, func
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    owner_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    file_size: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    encoding: Mapped[str] = mapped_column(String(32), nullable=False, default="utf-8")
    chapters: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    normalization_version: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=1
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    file_deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
