"""FastAPI dependencies: authenticate a bearer token and enforce RBAC."""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from systemconfig.config import get_settings
from systemconfig.errors import ApiError, forbidden, unauthorized
from systemconfig.security.jwks import JwksVerifier, TokenVerificationError
from systemconfig.security.rbac import has_any_permission

_verifier: JwksVerifier | None = None

# Registered so the OpenAPI document advertises the scheme (Swagger's
# "Authorize" button). `auto_error=False` lets us return the platform's own
# error envelope instead of Starlette's default 403.
_bearer_scheme = HTTPBearer(
    auto_error=False,
    description="RS256 access token issued by the StepStyle auth service.",
)


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
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> Principal:
    """Verify the ``Authorization: Bearer <JWT>`` header against the JWKS.

    Public keys are cached; the auth service is never called per request. A
    JWKS outage fails closed with ``503`` rather than silently allowing access.
    """
    if credentials is None or not credentials.credentials:
        # Distinguish a missing header from a malformed one for the caller.
        if not request.headers.get("authorization"):
            raise unauthorized("MISSING_TOKEN", "Authentication token required")
        raise unauthorized("INVALID_TOKEN", "Authorization header must be 'Bearer <token>'")

    try:
        payload = await get_verifier().verify(credentials.credentials)
    except TokenVerificationError as exc:
        status = 503 if exc.code == "JWKS_UNAVAILABLE" else 401
        raise ApiError(status, exc.code, exc.message) from exc

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
