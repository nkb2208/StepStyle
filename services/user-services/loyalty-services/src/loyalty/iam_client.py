"""Client gọi IAM (Service 1) để lấy email và tên của user."""

from __future__ import annotations

import logging

import httpx

from loyalty.config import get_settings

logger = logging.getLogger("loyalty.iam")


async def fetch_me(token: str) -> dict | None:
    """Gọi GET /api/auth/me bằng token của khách.

    Trả về dict {id, email, name, role, ...} hoặc None nếu IAM lỗi.
    Cố ý không raise: IAM chậm hoặc tắt thì API của mình vẫn chạy được.
    """
    url = f"{get_settings().auth_service_url.rstrip('/')}/api/auth/me"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
    except httpx.RequestError as exc:
        logger.warning("Không gọi được IAM /me: %s", exc)
        return None

    if resp.status_code != 200:
        logger.warning("IAM /me trả về HTTP %s", resp.status_code)
        return None

    try:
        body = resp.json()
    except ValueError:
        return None
    data = body.get("data", body) if isinstance(body, dict) else {}
    user = data.get("user") if isinstance(data, dict) else None
    return user if isinstance(user, dict) else None