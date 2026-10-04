"""JWKS token verification — the Python twin of `JwksVerifier` in the auth SDK."""

from __future__ import annotations

import asyncio
import time
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from adminfeat.security.jwks import JwksVerifier, TokenVerificationError

ISSUER = "auth.yourdomain.com"
AUDIENCE = "api.yourdomain.com"
KID = "test-key-1"

_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_public_pem = _private_key.public_key().public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
)


def make_verifier() -> JwksVerifier:
    """Verifier with a pre-seeded key so no HTTP round-trip is needed."""
    verifier = JwksVerifier(
        jwks_url="http://127.0.0.1:9/jwks.json",  # unreachable on purpose
        issuer=ISSUER,
        audience=AUDIENCE,
    )
    verifier._keys = {KID: serialization.load_pem_public_key(_public_pem)}
    verifier._last_fetch = time.monotonic()
    return verifier


def sign(overrides: dict | None = None, *, headers: dict | None = None) -> str:
    now = datetime.now(UTC)
    claims = {
        "sub": "65f1c2admin",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": now,
        "exp": now + timedelta(minutes=15),
        "type": "user",
        "role": "ADMIN",
        "permissions": ["*:*"],
        "jti": "jti-1",
    }
    claims.update(overrides or {})
    return jwt.encode(claims, _private_key, algorithm="RS256", headers=headers or {"kid": KID})


def run(coro):
    return asyncio.run(coro)


def test_valid_token_verifies_and_keeps_claims():
    payload = run(make_verifier().verify(sign()))
    assert payload["sub"] == "65f1c2admin"
    assert payload["role"] == "ADMIN"
    assert payload["permissions"] == ["*:*"]


def test_expired_token_is_rejected():
    token = sign({"exp": datetime.now(UTC) - timedelta(minutes=5)})
    with pytest.raises(TokenVerificationError) as exc:
        run(make_verifier().verify(token))
    assert exc.value.code == "TOKEN_EXPIRED"


def test_wrong_issuer_is_rejected():
    token = sign({"iss": "https://evil.example"})
    with pytest.raises(TokenVerificationError) as exc:
        run(make_verifier().verify(token))
    assert exc.value.code == "INVALID_TOKEN"


def test_wrong_audience_is_rejected():
    token = sign({"aud": "someone-else"})
    with pytest.raises(TokenVerificationError) as exc:
        run(make_verifier().verify(token))
    assert exc.value.code == "INVALID_TOKEN"


def test_symmetric_signature_is_rejected_before_verification():
    now = datetime.now(UTC)
    token = jwt.encode(
        {"sub": "x", "iss": ISSUER, "aud": AUDIENCE, "iat": now, "exp": now + timedelta(minutes=5)},
        "secret",
        algorithm="HS256",
        headers={"kid": KID},
    )
    with pytest.raises(TokenVerificationError) as exc:
        run(make_verifier().verify(token))
    assert exc.value.code == "INVALID_ALGORITHM"


def test_tampered_payload_is_rejected():
    token = sign()
    head, _, tail = token.partition(".")
    tampered = f"{head}.{tail[:-3]}zzz"
    with pytest.raises(TokenVerificationError):
        run(make_verifier().verify(tampered))


def test_malformed_token_is_rejected():
    with pytest.raises(TokenVerificationError) as exc:
        run(make_verifier().verify("not-a-jwt"))
    assert exc.value.code == "INVALID_TOKEN"


def test_unreachable_jwks_endpoint_reports_jwks_unavailable():
    verifier = JwksVerifier(
        jwks_url="http://127.0.0.1:9/jwks.json", issuer=ISSUER, audience=AUDIENCE
    )
    with pytest.raises(TokenVerificationError) as exc:
        run(verifier.verify(sign()))
    assert exc.value.code == "JWKS_UNAVAILABLE"
