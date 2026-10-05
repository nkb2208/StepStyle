"""Small helpers shared by every router: pagination, money and envelopes."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from fastapi import Query

from adminfeat.config import get_settings


async def pagination(
    page: int = Query(default=1, ge=1, description="1-based page number"),
    page_size: int | None = Query(default=None, ge=1, description="Items per page"),
) -> tuple[int, int, int]:
    """Return ``(page, page_size, offset)`` with configured limits."""
    settings = get_settings()
    size = page_size or settings.page_size_default
    size = min(size, settings.page_size_max)
    return page, size, (page - 1) * size


def page_meta(page: int, page_size: int, total: int) -> dict[str, int]:
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "pages": max(1, -(-total // page_size)) if page_size else 1,
    }


def paginated(items: list[Any], page: int, page_size: int, total: int) -> dict[str, Any]:
    return {"items": items, "meta": page_meta(page, page_size, total)}


def money(value: Decimal | int | float | None) -> int | None:
    """`DECIMAL(15,0)` columns are whole units — expose them as integers."""
    if value is None:
        return None
    return int(value)
