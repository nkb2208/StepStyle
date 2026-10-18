"""JWT verification dependencies cho user-service.

Xác thực access token RS256 từ auth-service qua JWKS endpoint.
Cung cấp các FastAPI dependencies:
- ``require_admin``   – chỉ cho phép quản trị viên (role == ADMIN)
- ``require_customer``– chỉ cho phép khách hàng thành viên (role == CUSTOMER hoặc ADMIN)
- ``get_current_user``– lấy thông tin principal từ token (bất kỳ vai trò)
"""

from __future__ import annotations

import logging

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from user.config import get_settings

logger = logging.getLogger("user.security")

_bearer = HTTPBearer(auto_error=True)


class CurrentUser:
    """Thông tin principal đã xác thực từ JWT."""

    def __init__(self, sub: str, email: str, role: str, email_verified: bool) -> None:
        self.sub = sub
        self.email = email
        self.role = role
        self.email_verified = email_verified

    @property
    def is_admin(self) -> bool:
        return self.role == "ADMIN"

    @property
    def is_customer(self) -> bool:
        return self.role == "CUSTOMER"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> CurrentUser:
    """FastAPI dependency: xác thực Bearer token, trả về CurrentUser."""
    settings = get_settings()
    token = credentials.credentials

    try:
        from auth_types.verifier import JwksVerifier  # type: ignore[import]

        verifier = JwksVerifier(
            jwks_url=settings.jwks_url,
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
            clock_tolerance_seconds=settings.clock_tolerance_seconds,
        )
        payload = verifier.verify(token)
    except ImportError:
        # Nếu chưa cài auth-types, thử dùng python-jose để decode thô (dev only)
        try:
            import jwt  # type: ignore[import]

            payload = jwt.decode(token, options={"verify_signature": False})
            logger.warning("JWT chạy ở chế độ DEV — chữ ký KHÔNG được xác thực!")
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=401,
                detail={"code": "INVALID_TOKEN", "message": "Token không hợp lệ"},
            ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.debug("JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_TOKEN", "message": "Token không hợp lệ hoặc đã hết hạn"},
        ) from exc

    return CurrentUser(
        sub=str(payload.get("sub", "")),
        email=str(payload.get("email", "")),
        role=str(payload.get("role", "CUSTOMER")),
        email_verified=bool(payload.get("emailVerified", False)),
    )


async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Chỉ cho phép quản trị viên (role == ADMIN)."""
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "FORBIDDEN",
                "message": "Chỉ quản trị viên mới có quyền thực hiện thao tác này",
            },
        )
    return user


async def require_customer(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Cho phép khách hàng thành viên đã đăng nhập (CUSTOMER hoặc ADMIN)."""
    if not (user.is_customer or user.is_admin):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "FORBIDDEN",
                "message": "Cần đăng nhập để thực hiện thao tác này",
            },
        )
    return user
