import hashlib
import os
import re
from pathlib import Path
from uuid import uuid4

from app.core.config import settings


MAX_BOOK_BYTES = 4 * 1024 * 1024

# \u89c4\u8303\u5316\u89c4\u5219\u5fc5\u987b\u4e0e\u524d\u7aef normalizeBookContent\uff08frontend/src/utils/text-pagination.js\uff09\u9010\u5b57\u4e00\u81f4\uff0c
# \u8bc4\u8bba\u548c\u7b14\u8bb0\u7684\u504f\u79fb\u91cf\u90fd\u57fa\u4e8e\u89c4\u8303\u5316\u540e\u7684\u6b63\u6587\u3002\u524d\u7aef\u7528\u7684\u662f JavaScript \u7684 \s / trim()\uff0c
# \u800c Python \u7684 \s / str.strip() \u4f1a\u989d\u5916\u628a \x1c-\x1f\u3001\x85 \u5f53\u4f5c\u7a7a\u767d\u3001\u5374\u4e0d\u8ba4 \ufeff\uff0c
# \u6240\u4ee5\u8fd9\u91cc\u663e\u5f0f\u5217\u51fa JavaScript \u7684\u7a7a\u767d\u5b57\u7b26\u96c6\uff0c\u4e0d\u4f7f\u7528 Python \u81ea\u5e26\u7684\u5b9a\u4e49\u3002
_JS_SPACE_CHARACTERS = (
    "\t\v\f\r \u00a0\u1680"
    + "".join(chr(code) for code in range(0x2000, 0x200B))
    + "\u2028\u2029\u202f\u205f\u3000\ufeff"
)
_JS_WHITESPACE = _JS_SPACE_CHARACTERS + "\n"
# \u53ea\u542b\u7a7a\u767d\u3001\u96f6\u5bbd\u7a7a\u683c\u7684\u884c\u89c6\u4e3a\u7a7a\u884c\u3002
_BLANK_LINES = re.compile("\n(?:[" + re.escape(_JS_SPACE_CHARACTERS) + "\u200b]*\n)+")


def normalize_book_content(content: str) -> str:
    normalized = content.removeprefix("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    normalized = _BLANK_LINES.sub("\n", normalized)
    return re.sub(r"\n+", "\n", normalized).strip(_JS_WHITESPACE)


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
