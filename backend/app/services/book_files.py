import hashlib
import os
import re
from pathlib import Path
from uuid import uuid4

from app.core.config import settings


MAX_BOOK_BYTES = 4 * 1024 * 1024


def normalize_book_content(content: str) -> str:
    normalized = content.removeprefix("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    normalized = re.sub(r"\n(?:[^\S\n\u200b\ufeff]*\n)+", "\n", normalized)
    return re.sub(r"\n+", "\n", normalized).strip()


def prepare_book_content(content: str) -> tuple[str, bytes, str]:
    if len(content.encode("utf-8")) > MAX_BOOK_BYTES:
        raise ValueError("图书正文不能超过 4 MB")

    normalized = normalize_book_content(content)
    if not normalized:
        raise ValueError("图书文件没有可阅读的内容")

    encoded = normalized.encode("utf-8")
    return normalized, encoded, hashlib.sha256(encoded).hexdigest()


def utf16_length(content: str) -> int:
    return len(content.encode("utf-16-le")) // 2


def index_from_utf16_offset(content: str, offset: int) -> int:
    if offset < 0:
        raise ValueError("正文位置无效")

    consumed = 0
    for index, character in enumerate(content):
        if consumed == offset:
            return index
        consumed += 2 if ord(character) > 0xFFFF else 1
        if consumed > offset:
            raise ValueError("正文位置不能落在字符中间")

    if consumed == offset:
        return len(content)
    raise ValueError("正文位置超出范围")


def _storage_directory() -> Path:
    directory = settings.book_storage_dir.expanduser().resolve()
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def write_book_file(content: bytes) -> str:
    storage_key = f"{uuid4().hex}.txt"
    target = _storage_directory() / storage_key
    temporary = target.with_suffix(".tmp")
    temporary.write_bytes(content)
    os.replace(temporary, target)
    return storage_key


def read_book_file(storage_key: str) -> str:
    path = _storage_directory() / Path(storage_key).name
    return path.read_text(encoding="utf-8")


def delete_book_file(storage_key: str) -> None:
    path = _storage_directory() / Path(storage_key).name
    path.unlink(missing_ok=True)
