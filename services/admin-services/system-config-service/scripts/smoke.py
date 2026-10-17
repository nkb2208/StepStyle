"""End-to-end smoke test for the System Configuration Service.

Drives the real HTTP API against a **real MySQL** database, using a
**genuinely signed RS256 token** verified through a throwaway JWKS endpoint
served from a background thread — the same flow as the auth service, without
needing it to be running.

Prerequisites
-------------
* ``DATABASE_URL`` points at a MySQL ``stepstyle_db`` (see ``.env`` / the
  service ``docker-compose.yml``). The three ``caidat*`` tables are created if
  they are missing.
* ``JWKS_URL`` / ``JWT_ISSUER`` / ``JWT_AUDIENCE`` are overridden by this script.

The script only flips toggles and restores the previous values afterwards; it
never deletes a row.

Usage::

    python scripts/smoke.py
"""

from __future__ import annotations

import asyncio
import json
import os
import threading
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

ISSUER = "auth.yourdomain.com"
AUDIENCE = "api.yourdomain.com"
KID = "smoke-key-1"

# ── Throwaway signing key + JWKS endpoint ───────────────────────────────────
_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_public_key = _private_key.public_key()
_jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(_public_key))


class _JwksHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # stdlib callback name
        if self.path != "/.well-known/jwks.json":
            self.send_error(404)
            return
        body = json.dumps({"keys": [{**_jwk, "kid": KID, "use": "sig", "alg": "RS256"}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args) -> None:  # keep the output clean
        return


_server = ThreadingHTTPServer(("127.0.0.1", 0), _JwksHandler)
_server.daemon_threads = True
_port = _server.server_address[1]
threading.Thread(target=_server.serve_forever, daemon=True).start()

# Environment variables take precedence over the .env file, so these win even if
# a real auth service is configured.
os.environ["JWKS_URL"] = f"http://127.0.0.1:{_port}/.well-known/jwks.json"
os.environ["JWT_ISSUER"] = ISSUER
os.environ["JWT_AUDIENCE"] = AUDIENCE
os.environ.setdefault("DATABASE_URL", "mysql+aiomysql://root:root@localhost:3306/stepstyle_db")

import httpx  # noqa: E402

from systemconfig.db import Base, engine  # noqa: E402
from systemconfig.main import app  # noqa: E402

STORE = "/api/v1/settings/store"
PAYMENTS = "/api/v1/settings/payment-methods"
PARTNERS = "/api/v1/settings/shipping-partners"


def make_token(*, role: str, permissions: list[str], sub: str = "smoke-user") -> str:
    now = datetime.now(UTC)
    claims = {
        "sub": sub,
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": now,
        "exp": now + timedelta(minutes=15),
        "type": "user",
        "role": role,
        "permissions": permissions,
        "jti": "smoke-jti",
    }
    return jwt.encode(claims, _private_key, algorithm="RS256", headers={"kid": KID})


def ok(label: str) -> None:
    print(f"  [ok] {label}")


async def ensure_schema() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


async def run_scenario() -> None:
    admin = {"Authorization": f"Bearer {make_token(role='ADMIN', permissions=['*:*'])}"}
    customer_token = make_token(role="CUSTOMER", permissions=["product:read"], sub="smoke-cust")
    customer = {"Authorization": f"Bearer {customer_token}"}

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://smoke") as client:
        # ── Health ──────────────────────────────────────────────────────────
        assert (await client.get("/health")).json() == {"status": "ok"}
        ok("GET /health")

        # ── Authentication / authorization ──────────────────────────────────
        assert (await client.get(STORE)).status_code == 401
        ok("store read without a token → 401")

        assert (await client.get(STORE, headers=customer)).status_code == 403
        assert (
            await client.put(STORE, headers=customer, json={"store_name": "Hacked"})
        ).status_code == 403
        ok("customer is forbidden from reading/writing settings → 403")

        me = await client.get("/api/v1/me", headers=admin)
        assert me.status_code == 200 and me.json()["data"]["principal"]["role"] == "ADMIN"
        ok("GET /api/v1/me echoes the verified principal")

        # ── Store information ───────────────────────────────────────────────
        original_store = (await client.get(STORE, headers=admin)).json()["data"]
        assert original_store["base_shipping_fee"] >= 0
        ok("GET store returns the persisted configuration")

        updated = await client.put(
            STORE,
            headers=admin,
            json={"store_name": "StepStyle Smoke", "base_shipping_fee": 40000},
        )
        assert updated.status_code == 200
        body = updated.json()["data"]
        assert body["store_name"] == "StepStyle Smoke" and body["base_shipping_fee"] == 40000
        # Untouched field kept its value (partial update).
        assert body["free_shipping_threshold"] == original_store["free_shipping_threshold"]
        ok("PUT store updates fields and keeps the untouched ones")

        assert (
            await client.put(STORE, headers=admin, json={"base_shipping_fee": -1})
        ).status_code == 422
        ok("negative shipping fee → 422")

        # ── Payment methods ─────────────────────────────────────────────────
        methods = (await client.get(PAYMENTS, headers=admin)).json()["data"]
        by_code = {method["code"]: method for method in methods}
        assert {"momo", "vnpay"} <= set(by_code)
        ok(f"GET payment methods ({len(methods)} configured)")

        before = by_code["momo"]["enabled"]
        toggled = await client.put(
            PAYMENTS + f"/{by_code['momo']['id']}", headers=admin, json={"enabled": not before}
        )
        assert toggled.json()["data"]["enabled"] is (not before)
        after = (await client.get(PAYMENTS, headers=admin)).json()["data"]
        assert {m["code"]: m["enabled"] for m in after}["momo"] is (not before)
        assert len(after) == len(methods)  # never deleted
        ok("toggling MoMo persists and never deletes the row")

        assert (
            await client.put(PAYMENTS + "/999999", headers=admin, json={"enabled": True})
        ).status_code == 404
        ok("unknown payment-method id → 404")

        # ── Shipping partners ───────────────────────────────────────────────
        partners = (await client.get(PARTNERS, headers=admin)).json()["data"]
        assert {p["code"] for p in partners} == {"ghtk", "ghn", "jnt", "viettelpost"}
        ghtk = next(p for p in partners if p["code"] == "ghtk")
        ghtk_before = ghtk["enabled"]
        await client.put(
            PARTNERS + f"/{ghtk['id']}", headers=admin, json={"enabled": not ghtk_before}
        )
        refreshed = (await client.get(PARTNERS, headers=admin)).json()["data"]
        assert {p["code"]: p["enabled"] for p in refreshed}["ghtk"] is (not ghtk_before)
        ok(f"GET + toggling shipping partners ({len(partners)} configured)")

        assert (
            await client.put(PARTNERS + "/999999", headers=admin, json={"enabled": True})
        ).status_code == 404
        ok("unknown shipping-partner id → 404")

        # ── Restore the previous state ──────────────────────────────────────
        await client.put(PARTNERS + f"/{ghtk['id']}", headers=admin, json={"enabled": ghtk_before})
        await client.put(
            PAYMENTS + f"/{by_code['momo']['id']}", headers=admin, json={"enabled": before}
        )
        await client.put(
            STORE,
            headers=admin,
            json={
                "store_name": original_store["store_name"],
                "contact_email": original_store["contact_email"],
                "phone": original_store["phone"],
                "warehouse_address": original_store["warehouse_address"],
                "base_shipping_fee": original_store["base_shipping_fee"],
                "free_shipping_threshold": original_store["free_shipping_threshold"],
            },
        )
        ok("restored the previous configuration")


async def main() -> None:
    print("System Configuration Service — smoke test")
    print(f"  database: {engine.url.render_as_string(hide_password=True)}")
    print(f"  jwks    : {os.environ['JWKS_URL']}")
    await ensure_schema()
    try:
        await run_scenario()
    finally:
        await engine.dispose()
    print("SMOKE OK")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    finally:
        _server.shutdown()
