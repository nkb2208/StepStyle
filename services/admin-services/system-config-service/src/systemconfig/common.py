"""Small helpers shared by the routers: money and the response envelope."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from systemconfig.errors import failure


def money(value: Decimal | int | float | None) -> int | None:
    """`DECIMAL(15,0)` columns are whole units — expose them as integers."""
    if value is None:
        return None
    return int(value)


def envelope(data: Any) -> dict[str, Any]:
    """Success envelope, identical in shape to the auth service."""
    return {"success": True, "data": data}


__all__ = ["envelope", "failure", "money"]
