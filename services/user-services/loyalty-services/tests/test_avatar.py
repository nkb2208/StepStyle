"""Test upload avatar."""

from __future__ import annotations

AVATAR = "/api/v1/users/me/avatar"
PNG_HEADER = b"\x89PNG\r\n\x1a\n"


def _png(size: int = 100) -> bytes:
    return PNG_HEADER + b"0" * size


def _upload(client, data: bytes, name: str = "a.png", mime: str = "image/png"):
    return client.post(AVATAR, files={"file": (name, data, mime)})


def test_upload_avatar_and_fetch_it(client, login_as):
    login_as("u-avatar-1")
    r = _upload(client, _png())
    assert r.status_code == 200
    url = r.json()["avatar_url"]
    assert url.startswith("/static/avatars/")
    assert url.endswith(".png")

    served = client.get(url)  # ảnh phải tải về được qua đường dẫn công khai
    assert served.status_code == 200
    assert served.content == _png()


def test_rejects_non_image_even_if_mime_is_faked(client, login_as):
    login_as("u-avatar-2")
    r = _upload(client, b"day-khong-phai-anh", name="evil.png", mime="image/png")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "INVALID_IMAGE"


def test_rejects_too_large_file(client, login_as):
    login_as("u-avatar-3")
    r = _upload(client, _png(3 * 1024 * 1024))
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_new_avatar_replaces_old_file(client, login_as):
    login_as("u-avatar-4")
    first = _upload(client, _png(10)).json()["avatar_url"]
    second = _upload(client, _png(20)).json()["avatar_url"]
    assert first != second
    assert client.get(first).status_code == 404  # ảnh cũ đã bị xóa
    assert client.get(second).status_code == 200