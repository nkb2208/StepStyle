"""Common utilities shared across the User Service."""

from __future__ import annotations


def paginate(total: int, page: int, page_size: int) -> dict:
    """Return pagination metadata."""
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
    }
