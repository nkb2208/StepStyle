import asyncio
import json
import logging
import os
import time
from typing import Any, Optional

import httpx
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger("product.security")

JWKS_URL = os.getenv("JWKS_URL", "http://localhost:4000/.well-known/jwks.json")
JWT_ISSUER = os.getenv("JWT_ISSUER", "auth.yourdomain.com")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "api.yourdomain.com")
CLOCK_TOLERANCE_SECONDS = int(os.getenv("CLOCK_TOLERANCE_SECONDS", "5"))
JWKS_REFRESH_SECONDS = int(os.getenv("JWKS_REFRESH_SECONDS", "60"))
JWKS_TIMEOUT_SECONDS = float(os.getenv("JWKS_TIMEOUT_SECONDS", "5"))


class TokenVerificationError(Exception):
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
        self.jwks_url = jwks_url
        self.issuer = issuer
        self.audience = audience
        self.clock_tolerance_seconds = clock_tolerance_seconds
        self.refresh_seconds = refresh_seconds
        self.timeout_seconds = timeout_seconds

        self._keys: dict[str, Any] = {}
        self._last_fetch = 0.0
        self._lock = asyncio.Lock()

    async def _fetch(self, force: bool = False) -> None:
        now = time.monotonic()
        if not force and (now - self._last_fetch) < self.refresh_seconds:
            return

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

        await self._fetch(force=True)
        if kid and kid in self._keys:
            return self._keys[kid]
        if not kid:
            return next(iter(self._keys.values()), None)

        raise TokenVerificationError("UNKNOWN_KEY", f'No JWKS key found for kid "{kid}"')

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


_bearer = HTTPBearer(auto_error=True)
_verifier: Optional[JwksVerifier] = None


def get_verifier() -> JwksVerifier:
    global _verifier
    if _verifier is None:
        _verifier = JwksVerifier(
            jwks_url=JWKS_URL,
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
            clock_tolerance_seconds=CLOCK_TOLERANCE_SECONDS,
            refresh_seconds=JWKS_REFRESH_SECONDS,
            timeout_seconds=JWKS_TIMEOUT_SECONDS,
        )
    return _verifier


async def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict[str, Any]:
    token = credentials.credentials
    verifier = get_verifier()
    try:
        payload = await verifier.verify(token)
    except TokenVerificationError as exc:
        status_code = 401 if exc.code in {"INVALID_TOKEN", "TOKEN_EXPIRED", "INVALID_ALGORITHM"} else 503
        raise HTTPException(
            status_code=status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_TOKEN", "message": "Token không hợp lệ hoặc đã hết hạn"},
        ) from exc

    role = str(payload.get("role", "")).upper()
    if role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "Chỉ quản trị viên mới có quyền thực hiện thao tác này"},
        )
    return payload
