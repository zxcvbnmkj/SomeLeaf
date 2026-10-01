import secrets
from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.annotation import Annotation
from app.models.book import Book
from app.models.note import Note
from app.models.reading_room import ReadingRoom, RoomMember
from app.models.user import User
from app.schemas.reading import (
    AnnotationCreate,
    AnnotationPublic,
    AnnotationUpdate,
    CreateRoomRequest,
    JoinRoomRequest,
    NoteCreate,
    NotePublic,
    NoteUpdate,
    RoomBookPublic,
    RoomMemberPublic,
    RoomPublic,
    SharedBookPublic,
)
from app.services.book_files import (
    delete_book_file,
    index_from_utf16_offset,
    prepare_book_content,
    read_book_file,
    utf16_length,
    write_book_file,
)


router = APIRouter()


def get_room(room_id: int, db: Session) -> ReadingRoom:
    room = db.get(ReadingRoom, room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="共读房间不存在")
    return room


def require_member(room_id: int, user: User, db: Session) -> ReadingRoom:
    room = get_room(room_id, db)
    if db.get(RoomMember, (room_id, user.id)) is None:
        raise HTTPException(status_code=403, detail="你不是该共读房间的成员")
    return room


def require_active(room: ReadingRoom) -> None:
    if room.status != "active":
        raise HTTPException(status_code=409, detail="该共读已经关闭，内容仅可查看")


def room_public(room: ReadingRoom, user: User, db: Session) -> RoomPublic:
    book = db.get(Book, room.book_id)
    member_rows = db.execute(
        select(RoomMember, User)
        .join(User, User.id == RoomMember.user_id)
        .where(RoomMember.room_id == room.id)
        .order_by(RoomMember.joined_at, RoomMember.user_id)
    ).all()
    members = [
        RoomMemberPublic(
            id=member.id,
            username=member.username,
            joined_at=membership.joined_at,
        )
        for membership, member in member_rows
    ]
    if book is None:
        raise HTTPException(status_code=500, detail="共读图书数据不完整")

    return RoomPublic(
        id=room.id,
        invite_code=room.invite_code,
        status=room.status,
        owner_id=room.owner_id,
        is_owner=room.owner_id == user.id,
        created_at=room.created_at,
        closed_at=room.closed_at,
        member_count=len(members),
        members=members,
        book=SharedBookPublic(
            id=book.id,
            title=book.title,
            file_name=book.file_name,
            file_size=book.file_size,
            encoding=book.encoding,
        ),
    )


def available_invite_code(db: Session) -> str:
    for _ in range(30):
        code = f"{secrets.randbelow(1_000_000):06d}"
        exists = db.scalar(
            select(ReadingRoom.id).where(ReadingRoom.invite_code == code)
        )
        if exists is None:
            return code
    raise HTTPException(status_code=503, detail="暂时无法生成邀请码，请稍后重试")


def active_book_content(room: ReadingRoom, db: Session) -> tuple[Book, str]:
    book = db.get(Book, room.book_id)
    if book is None:
        raise HTTPException(status_code=500, detail="共读图书数据不完整")
    if book.file_deleted_at is not None:
        raise HTTPException(status_code=410, detail="服务器上的 TXT 已被删除")
    try:
        return book, read_book_file(book.storage_key)
    except (OSError, UnicodeError):
        raise HTTPException(status_code=500, detail="服务器无法读取 TXT 文件") from None


def annotation_public(annotation: Annotation, username: str) -> AnnotationPublic:
    return AnnotationPublic(
        id=annotation.id,
        room_id=annotation.room_id,
        user_id=annotation.user_id,
        username=username,
        start_offset=annotation.start_offset,
        end_offset=annotation.end_offset,
        quote=annotation.quote,
        context_before=annotation.context_before,
        context_after=annotation.context_after,
        comment=annotation.comment,
        created_at=annotation.created_at,
        updated_at=annotation.updated_at,
    )


def note_public(note: Note, username: str) -> NotePublic:
    return NotePublic(
        id=note.id,
        room_id=note.room_id,
        user_id=note.user_id,
        username=username,
        title=note.title,
        content=note.content,
        anchor_offset=note.anchor_offset,
        quote=note.quote,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.post("", response_model=RoomPublic, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: CreateRoomRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RoomPublic:
    if Path(payload.file_name).suffix.lower() != ".txt":
        raise HTTPException(status_code=422, detail="只能共享 TXT 文件")
    try:
        _, encoded, content_hash = prepare_book_content(payload.content)
        storage_key = write_book_file(encoded)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from None
    except OSError:
        raise HTTPException(status_code=500, detail="服务器保存 TXT 文件失败") from None

    book = Book(
        owner_id=user.id,
        title=payload.title,
        file_name=payload.file_name,
        storage_key=storage_key,
        file_size=len(encoded),
        content_hash=content_hash,
        encoding="utf-8",
        normalization_version=1,
    )
    try:
        db.add(book)
        db.flush()
        room = ReadingRoom(
            book_id=book.id,
            owner_id=user.id,
            invite_code=available_invite_code(db),
            status="active",
        )
        db.add(room)
        db.flush()
        db.add(RoomMember(room_id=room.id, user_id=user.id))
        db.commit()
    except IntegrityError:
        db.rollback()
        delete_book_file(storage_key)
        raise HTTPException(status_code=409, detail="创建共读失败，请重试") from None
    except Exception:
        db.rollback()
        delete_book_file(storage_key)
        raise

    db.refresh(room)
    return room_public(room, user, db)


@router.post("/join", response_model=RoomBookPublic)
def join_room(
    payload: JoinRoomRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RoomBookPublic:
    room = db.scalar(
        select(ReadingRoom).where(
            ReadingRoom.invite_code == payload.invite_code,
            ReadingRoom.status == "active",
        )
    )
    if room is None:
        raise HTTPException(status_code=404, detail="邀请码无效或共读已经关闭")

    if db.get(RoomMember, (room.id, user.id)) is None:
        db.add(RoomMember(room_id=room.id, user_id=user.id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()

    _, content = active_book_content(room, db)
    return RoomBookPublic(room=room_public(room, user, db), content=content)


@router.get("/{room_id}", response_model=RoomPublic)
def room_details(
    room_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RoomPublic:
    room = require_member(room_id, user, db)
    return room_public(room, user, db)


@router.get("/{room_id}/book", response_model=RoomBookPublic)
def download_book(
    room_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RoomBookPublic:
    room = require_member(room_id, user, db)
    _, content = active_book_content(room, db)
    return RoomBookPublic(room=room_public(room, user, db), content=content)


@router.post("/{room_id}/close", response_model=RoomPublic)
def close_room(
    room_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RoomPublic:
    room = require_member(room_id, user, db)
    if room.owner_id != user.id:
        raise HTTPException(status_code=403, detail="只有创建共读的用户可以关闭")
    require_active(room)
    book = db.get(Book, room.book_id)
    if book is None:
        raise HTTPException(status_code=500, detail="共读图书数据不完整")

    try:
        delete_book_file(book.storage_key)
    except OSError:
        raise HTTPException(status_code=500, detail="删除服务器 TXT 文件失败") from None

    now = datetime.now()
    room.status = "closed"
    room.closed_at = now
    book.file_deleted_at = now
    db.commit()
    db.refresh(room)
    return room_public(room, user, db)


@router.get("/{room_id}/annotations", response_model=list[AnnotationPublic])
def list_annotations(
    room_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[AnnotationPublic]:
    require_member(room_id, user, db)
    rows = db.execute(
        select(Annotation, User.username)
        .join(User, User.id == Annotation.user_id)
        .where(Annotation.room_id == room_id)
        .order_by(Annotation.start_offset, Annotation.created_at)
    ).all()
    return [annotation_public(annotation, username) for annotation, username in rows]


@router.post(
    "/{room_id}/annotations",
    response_model=AnnotationPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_annotation(
    room_id: int,
    payload: AnnotationCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AnnotationPublic:
    room = require_member(room_id, user, db)
    require_active(room)
    _, content = active_book_content(room, db)
    if payload.end_offset > utf16_length(content):
        raise HTTPException(status_code=422, detail="划线位置超出正文范围")

    try:
        start_index = index_from_utf16_offset(content, payload.start_offset)
        end_index = index_from_utf16_offset(content, payload.end_offset)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from None

    annotation = Annotation(
        room_id=room_id,
        user_id=user.id,
        start_offset=payload.start_offset,
        end_offset=payload.end_offset,
        quote=content[start_index:end_index],
        context_before=content[max(0, start_index - 120) : start_index] or None,
        context_after=content[end_index : end_index + 120] or None,
        comment=payload.comment,
    )
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return annotation_public(annotation, user.username)


@router.patch("/{room_id}/annotations/{annotation_id}", response_model=AnnotationPublic)
def update_annotation(
    room_id: int,
    annotation_id: int,
    payload: AnnotationUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AnnotationPublic:
    room = require_member(room_id, user, db)
    require_active(room)
    annotation = db.get(Annotation, annotation_id)
    if annotation is None or annotation.room_id != room_id:
        raise HTTPException(status_code=404, detail="划线评论不存在")
    if annotation.user_id != user.id:
        raise HTTPException(status_code=403, detail="只能编辑自己的划线评论")
    annotation.comment = payload.comment
    db.commit()
    db.refresh(annotation)
    return annotation_public(annotation, user.username)


@router.delete(
    "/{room_id}/annotations/{annotation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_annotation(
    room_id: int,
    annotation_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    room = require_member(room_id, user, db)
    require_active(room)
    annotation = db.get(Annotation, annotation_id)
    if annotation is None or annotation.room_id != room_id:
        raise HTTPException(status_code=404, detail="划线评论不存在")
    if annotation.user_id != user.id:
        raise HTTPException(status_code=403, detail="只能删除自己的划线评论")
    db.delete(annotation)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{room_id}/notes", response_model=list[NotePublic])
def list_notes(
    room_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[NotePublic]:
    require_member(room_id, user, db)
    rows = db.execute(
        select(Note, User.username)
        .join(User, User.id == Note.user_id)
        .where(Note.room_id == room_id)
        .order_by(Note.created_at.desc())
    ).all()
    return [note_public(note, username) for note, username in rows]


@router.post(
    "/{room_id}/notes",
    response_model=NotePublic,
    status_code=status.HTTP_201_CREATED,
)
def create_note(
    room_id: int,
    payload: NoteCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> NotePublic:
    room = require_member(room_id, user, db)
    require_active(room)
    _, book_content = active_book_content(room, db)
    if payload.anchor_offset is not None and payload.anchor_offset > utf16_length(book_content):
        raise HTTPException(status_code=422, detail="笔记位置超出正文范围")
    if payload.anchor_offset is not None and payload.quote:
        try:
            anchor_index = index_from_utf16_offset(book_content, payload.anchor_offset)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from None
        actual_quote = book_content[
            anchor_index : anchor_index + len(payload.quote)
        ]
        if actual_quote != payload.quote:
            raise HTTPException(status_code=422, detail="笔记引用的原文位置无效")

    note = Note(
        room_id=room_id,
        user_id=user.id,
        title=payload.title,
        content=payload.content,
        anchor_offset=payload.anchor_offset,
        quote=payload.quote,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note_public(note, user.username)


@router.patch("/{room_id}/notes/{note_id}", response_model=NotePublic)
def update_note(
    room_id: int,
    note_id: int,
    payload: NoteUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> NotePublic:
    room = require_member(room_id, user, db)
    require_active(room)
    note = db.get(Note, note_id)
    if note is None or note.room_id != room_id:
        raise HTTPException(status_code=404, detail="读书笔记不存在")
    if note.user_id != user.id:
        raise HTTPException(status_code=403, detail="只能编辑自己的读书笔记")

    if "title" in payload.model_fields_set:
        note.title = payload.title
    if "content" in payload.model_fields_set:
        note.content = payload.content or ""
    db.commit()
    db.refresh(note)
    return note_public(note, user.username)


@router.delete("/{room_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    room_id: int,
    note_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    room = require_member(room_id, user, db)
    require_active(room)
    note = db.get(Note, note_id)
    if note is None or note.room_id != room_id:
        raise HTTPException(status_code=404, detail="读书笔记不存在")
    if note.user_id != user.id:
        raise HTTPException(status_code=403, detail="只能删除自己的读书笔记")
    db.delete(note)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
