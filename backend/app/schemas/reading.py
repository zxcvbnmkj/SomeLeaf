from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator


class ChapterIndex(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    startOffset: int = Field(ge=0)


class CreateRoomRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    file_name: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    chapters: list[ChapterIndex] = Field(default_factory=list, max_length=2000)

    @field_validator("title", "file_name")
    @classmethod
    def strip_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("内容不能为空")
        return stripped


class JoinRoomRequest(BaseModel):
    invite_code: str = Field(pattern=r"^[0-9]{6}$")


class SharedBookPublic(BaseModel):
    id: int
    title: str
    file_name: str
    file_size: int
    encoding: str
    chapters: list[ChapterIndex]


class RoomMemberPublic(BaseModel):
    id: int
    username: str
    joined_at: datetime


class RoomPublic(BaseModel):
    id: int
    invite_code: str
    status: str
    owner_id: int
    is_owner: bool
    created_at: datetime
    closed_at: datetime | None
    member_count: int
    members: list[RoomMemberPublic]
    book: SharedBookPublic


class RoomBookPublic(BaseModel):
    room: RoomPublic
    content: str


class AnnotationCreate(BaseModel):
    start_offset: int = Field(ge=0)
    end_offset: int = Field(gt=0)
    comment: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def offsets_are_valid(self) -> "AnnotationCreate":
        if self.start_offset >= self.end_offset:
            raise ValueError("划线起点必须小于终点")
        if self.end_offset - self.start_offset > 2000:
            raise ValueError("单次划线不能超过 2000 个字符")
        return self

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class AnnotationUpdate(BaseModel):
    comment: str | None = Field(max_length=4000)

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class AnnotationPublic(BaseModel):
    id: int
    room_id: int
    user_id: int
    username: str
    start_offset: int
    end_offset: int
    quote: str
    context_before: str | None
    context_after: str | None
    comment: str | None
    created_at: datetime
    updated_at: datetime


class NoteCreate(BaseModel):
    title: str | None = Field(default=None, max_length=120)
    content: str = Field(min_length=1, max_length=10000)
    anchor_offset: int | None = Field(default=None, ge=0)
    quote: str | None = Field(default=None, max_length=2000)

    @field_validator("title", "quote")
    @classmethod
    def normalize_optional(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        content = value.strip()
        if not content:
            raise ValueError("笔记内容不能为空")
        return content


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=120)
    content: str | None = Field(default=None, min_length=1, max_length=10000)

    @field_validator("title", "content")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @model_validator(mode="after")
    def contains_change(self) -> "NoteUpdate":
        if not self.model_fields_set:
            raise ValueError("没有需要修改的内容")
        if "content" in self.model_fields_set and self.content is None:
            raise ValueError("笔记内容不能为空")
        return self


class NotePublic(BaseModel):
    id: int
    room_id: int
    user_id: int
    username: str
    title: str | None
    content: str
    anchor_offset: int | None
    quote: str | None
    created_at: datetime
    updated_at: datetime
