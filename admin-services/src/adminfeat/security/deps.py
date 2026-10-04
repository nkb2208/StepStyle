"""FastAPI dependencies: authenticate a bearer token and enforce RBAC."""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

from fastapi import Depends, Header, Request

from adminfeat.config import get_settings
from adminfeat.errors import ApiError, forbidden, unauthorized
from adminfeat.security.jwks import JwksVerifier, TokenVerificationError
from adminfeat.security.rbac import has_any_permission

_verifier: JwksVerifier | None = None


def get_verifier() -> JwksVerifier:
    """Process-wide verifier singleton (JWKS is fetched once and cached)."""
    global _verifier
    if _verifier is None:
        settings = get_settings()
        _verifier = JwksVerifier(
            jwks_url=settings.jwks_url,
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
            clock_tolerance_seconds=settings.clock_tolerance_seconds,
            refresh_seconds=settings.jwks_refresh_seconds,
            timeout_seconds=settings.jwks_timeout_seconds,
        )
    return _verifier


def set_verifier(verifier: JwksVerifier | None) -> None:
    """Replace the singleton (tests / dependency overrides)."""
    global _verifier
    _verifier = verifier


@dataclass(frozen=True)
class Principal:
    """Authenticated caller — mirrors `AuthenticatedPrincipal` of the auth SDK."""

    type: str  # "user" | "service"
    permissions: Sequence[str] = field(default_factory=tuple)
    user_id: str | None = None
    client_id: str | None = None
    role: str | None = None
    email_verified: bool = False
    jti: str | None = None

    @property
    def is_admin(self) -> bool:
        return self.role == "ADMIN"

    @property
    def is_user(self) -> bool:
        return self.type == "user"


def principal_from_claims(payload: dict[str, Any]) -> Principal:
    permissions = tuple(payload.get("permissions") or ())
    if payload.get("type") == "service":
        return Principal(
            type="service",
            client_id=payload.get("sub"),
            permissions=permissions,
            jti=payload.get("jti"),
        )
    return Principal(
        type="user",
        user_id=payload.get("sub"),
        role=payload.get("role"),
        permissions=permissions,
        email_verified=bool(payload.get("emailVerified", False)),
        jti=payload.get("jti"),
    )


async def authenticate(
    request: Request,
    authorization: str | None = Header(default=None),
) -> Principal:
    """`Authorization: Bearer <JWT>` → verified principal on ``request.state``."""
    if not authorization or not authorization.startswith("Bearer "):
        raise unauthorized("MISSING_TOKEN", "Authentication token required")

    token = authorization[len("Bearer ") :].strip()
    try:
        payload = await get_verifier().verify(token)
    except TokenVerificationError as exc:
        if exc.code == "TOKEN_EXPIRED":
            raise unauthorized("TOKEN_EXPIRED", exc.message) from exc
        if exc.code in ("JWKS_UNAVAILABLE",):
            raise ApiError(
                503, "SERVICE_UNAVAILABLE", "Token verification is temporarily unavailable"
            ) from exc
        raise unauthorized(
            "INVALID_TOKEN", "The provided JWT access token is invalid or expired."
        ) from exc

    principal = principal_from_claims(payload)
    request.state.principal = principal
    return principal


def require_permission(*permissions: str) -> Callable[..., Awaitable[Principal]]:
    """Dependency factory: at least ONE of ``permissions`` must be granted."""

    async def dependency(
        principal: Principal = Depends(authenticate),
    ) -> Principal:
        if not has_any_permission(principal.permissions, permissions):
            raise forbidden("Missing required permissions for this resource")
        return principal

    return dependency


def require_role(*roles: str) -> Callable[..., Awaitable[Principal]]:
    """Dependency factory: only the given roles (user principals only)."""

    async def dependency(
        principal: Principal = Depends(authenticate),
    ) -> Principal:
        if not principal.is_user or principal.role not in roles:
            raise forbidden("Insufficient role permissions for this resource")
        return principal

    return dependency


def require_admin() -> Callable[..., Awaitable[Principal]]:
    return require_role("ADMIN")
