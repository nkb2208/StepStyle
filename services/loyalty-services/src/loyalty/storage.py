"""Lưu và xóa file avatar trên ổ đĩa."""

from __future__ import annotations

import uuid
from pathlib import Path

from loyalty.config import get_settings
from loyalty.errors import bad_request

AVATAR_URL_PREFIX = "/static/avatars"
_EXTENSIONS = {"jpeg": ".jpg", "png": ".png", "webp": ".webp"}


def detect_image_type(data: bytes) -> str | None:
    """Nhận dạng ảnh theo nội dung thật (magic bytes), không tin Content-Type."""
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def avatar_dir() -> Path:
    path = Path(get_settings().avatar_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_avatar(data: bytes) -> str:
    """Lưu ảnh với tên ngẫu nhiên, trả về URL công khai."""
    kind = detect_image_type(data)
    if kind is None:
        raise bad_request("INVALID_IMAGE", "Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP")
    name = f"{uuid.uuid4().hex}{_EXTENSIONS[kind]}"
    (avatar_dir() / name).write_bytes(data)
    return f"{AVATAR_URL_PREFIX}/{name}"


def delete_avatar(url: str | None) -> None:
    if not url or not url.startswith(AVATAR_URL_PREFIX):
        return
    target = avatar_dir() / Path(url).name  # chỉ lấy tên file, chống path traversal
    if target.is_file():
        target.unlink()