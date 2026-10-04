"""Stateless JWT verification against the auth service's JWKS endpoint.

Python counterpart of ``@ngocanh-auth/auth-types``' ``JwksVerifier``: the admin
service only ever downloads *public* key material (cached, refreshed every
minute) and validates RS256 tokens locally — no per-request call to the auth
service.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any

import httpx
import jwt

logger = logging.getLogger("adminfeat.jwks")


class TokenVerificationError(Exception):
    """Verification failure carrying the same codes as the auth service."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class JwksVerifier:
    def __init__(
        self,
        *,
        jwks_url: str,
        issuer: str,
        audience: str,
        clock_tolerance_seconds: int = 5,
        refresh_seconds: int = 60,
        timeout_seconds: float = 5.0,
    ) -> None:
        if not jwks_url:
            raise ValueError("Either jwksUrl or publicKeyPem must be provided")
        self.jwks_url = jwks_url
        self.issuer = issuer
        self.audience = audience
        self.clock_tolerance_seconds = clock_tolerance_seconds
        self.refresh_seconds = refresh_seconds
        self.timeout_seconds = timeout_seconds

        self._keys: dict[str, Any] = {}
        self._last_fetch = 0.0
        self._lock = asyncio.Lock()

    # ── JWKS handling ──────────────────────────────────────────────────────
    async def init(self) -> None:
        """Pre-fetch the JWKS at startup so misconfiguration fails fast."""
        await self._fetch(force=True)

    async def _fetch(self, force: bool = False) -> None:
        now = time.monotonic()
        if not force and (now - self._last_fetch) < self.refresh_seconds:
            return

        # single-flight: concurrent misses share one HTTP request
        async with self._lock:
            if not force and (time.monotonic() - self._last_fetch) < self.refresh_seconds:
                return
            try:
                async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                    response = await client.get(
                        self.jwks_url, headers={"accept": "application/json"}
                    )
                response.raise_for_status()
                document = response.json()
            except (httpx.HTTPError, ValueError) as exc:
                raise TokenVerificationError(
                    "JWKS_UNAVAILABLE",
                    f"Unable to fetch JWKS from {self.jwks_url}: {exc}",
                ) from exc

            keys = document.get("keys") if isinstance(document, dict) else None
            if not isinstance(keys, list) or not keys:
                raise TokenVerificationError("JWKS_UNAVAILABLE", "JWKS document contains no keys")

            resolved: dict[str, Any] = {}
            for jwk in keys:
                kid = jwk.get("kid")
                if not kid:
                    continue
                try:
                    resolved[kid] = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
                except Exception as exc:
                    logger.warning("Skipping unusable JWKS key %s: %s", kid, exc)
            if not resolved:
                raise TokenVerificationError(
                    "JWKS_UNAVAILABLE", "JWKS document contains no usable RSA keys"
                )
            self._keys = resolved
            self._last_fetch = time.monotonic()

    async def _resolve_key(self, kid: str | None) -> Any:
        if kid and kid in self._keys:
            return self._keys[kid]
        if not kid and self._keys:
            return next(iter(self._keys.values()))

        # Unknown `kid` → the auth service probably rotated its key pair.
        await self._fetch(force=True)
        if kid and kid in self._keys:
            return self._keys[kid]
        if not kid:
            return next(iter(self._keys.values()), None)

        raise TokenVerificationError("UNKNOWN_KEY", f'No JWKS key found for kid "{kid}"')

    # ── Verification ───────────────────────────────────────────────────────
    async def verify(self, token: str) -> dict[str, Any]:
        if not token or token.count(".") != 2:
            raise TokenVerificationError("INVALID_TOKEN", "Malformed JWT")

        try:
            header = jwt.get_unverified_header(token)
        except jwt.exceptions.DecodeError as exc:
            raise TokenVerificationError("INVALID_TOKEN", "Malformed JWT header") from exc

        if header.get("alg") != "RS256":
            raise TokenVerificationError("INVALID_ALGORITHM", "Token must be signed with RS256")

        key = await self._resolve_key(header.get("kid"))
        if key is None:
            raise TokenVerificationError("UNKNOWN_KEY", "No verification key available")

        try:
            payload = jwt.decode(
                token,
                key=key,
                algorithms=["RS256"],
                issuer=self.issuer,
                audience=self.audience,
                leeway=self.clock_tolerance_seconds,
                options={"require": ["exp", "iat", "sub"]},
            )
        except jwt.ExpiredSignatureError as exc:
            raise TokenVerificationError(
                "TOKEN_EXPIRED", "The provided JWT access token has expired"
            ) from exc
        except jwt.InvalidTokenError as exc:
            raise TokenVerificationError(
                "INVALID_TOKEN", "The provided JWT access token is invalid or expired."
            ) from exc

        if not isinstance(payload, dict):
            raise TokenVerificationError("INVALID_TOKEN", "Token payload must be an object")
        return payload
