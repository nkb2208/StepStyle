"""Xác thực JWT (RS256, qua JWKS của auth-service) cho order-service.

- ``require_staff`` – ADMIN hoặc SELLER (nhân viên) được quản lý đơn hàng.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from order.config import get_settings
from order.security.jwks import JwksVerifier, TokenVerificationError

logger = logging.getLogger("order.security")

_bearer = HTTPBearer(auto_error=True)
_verifier: Optional[JwksVerifier] = None

STAFF_ROLES = {"ADMIN", "SELLER"}


def get_verifier() -> JwksVerifier:
    global _verifier
    if _verifier is None:
        s = get_settings()
        _verifier = JwksVerifier(
            jwks_url=s.jwks_url,
            issuer=s.jwt_issuer,
            audience=s.jwt_audience,
            clock_tolerance_seconds=s.clock_tolerance_seconds,
            refresh_seconds=s.jwks_refresh_seconds,
            timeout_seconds=s.jwks_timeout_seconds,
        )
    return _verifier


class CurrentUser:
    def __init__(self, sub: str, email: str, role: str) -> None:
        self.sub = sub
        self.email = email
        self.role = role.upper()

    @property
    def is_staff(self) -> bool:
        return self.role in STAFF_ROLES


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> CurrentUser:
    try:
        payload = await get_verifier().verify(credentials.credentials)
    except TokenVerificationError as exc:
        status = 401 if exc.code in {"INVALID_TOKEN", "TOKEN_EXPIRED", "INVALID_ALGORITHM"} else 503
        raise HTTPException(
            status_code=status, detail={"code": exc.code, "message": exc.message}
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected error verifying token: %s", exc)
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_TOKEN", "message": "Token không hợp lệ hoặc đã hết hạn"},
        ) from exc
    return CurrentUser(
        sub=str(payload.get("sub", "")),
        email=str(payload.get("email", "")),
        role=str(payload.get("role", "CUSTOMER")),
    )


async def require_staff(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Chỉ ADMIN / SELLER được quản lý đơn hàng."""
    if not user.is_staff:
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "Bạn không có quyền quản lý đơn hàng"},
        )
    return user
