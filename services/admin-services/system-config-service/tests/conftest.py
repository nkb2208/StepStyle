"""Shared fixtures.

The suite is designed to run **without MySQL**: ``DATABASE_URL`` is pointed at a
throwaway SQLite file (``tests/.tmp/test.db``) before the application package is
imported. The production driver stays ``aiomysql`` — only the tests use
``aiosqlite``. Auth failures (401/403) are produced by overriding the
``authenticate`` dependency, so no real token or JWKS endpoint is needed.
"""

from __future__ import annotations

import os
import shutil
from collections.abc import Iterator
from pathlib import Path

_TMP_DIR = Path(__file__).resolve().parent / ".tmp"
if _TMP_DIR.exists():
    shutil.rmtree(_TMP_DIR, ignore_errors=True)
_TMP_DIR.mkdir(parents=True, exist_ok=True)
_DB_FILE = _TMP_DIR / "test.db"

# ── Environment must be set before importing `systemconfig` ─────────────────
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE.as_posix()}"
os.environ["JWKS_URL"] = "http://127.0.0.1:9/.well-known/jwks.json"
os.environ["JWKS_FAIL_FAST"] = "false"
os.environ["ENVIRONMENT"] = "test"
os.environ["LOG_LEVEL"] = "warning"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, delete  # noqa: E402

from systemconfig.db import Base  # noqa: E402
from systemconfig.main import app  # noqa: E402
from systemconfig.models import (  # noqa: E402
    CaiDatCuaHang,
    CaiDatDoiTacVanChuyen,
    CaiDatPhuongThucThanhToan,
)
from systemconfig.security.deps import Principal, authenticate, set_verifier  # noqa: E402
from systemconfig.security.jwks import TokenVerificationError  # noqa: E402


class _StubVerifier:
    """Verifier that never touches the network (the suite overrides `authenticate`).

    Token verification itself is covered by ``tests/test_jwks.py`` against a
    locally-signed RS256 token; the API tests only need the app to boot fast.
    """

    async def init(self) -> None:  # pragma: no cover - trivial
        return None

    async def verify(self, token: str) -> dict:  # pragma: no cover - never reached
        raise TokenVerificationError("INVALID_TOKEN", "stub verifier")


# A synchronous engine over the same file creates the schema and resets rows
# between tests. Using a separate (sync) engine avoids any event-loop coupling.
_sync_engine = create_engine(f"sqlite:///{_DB_FILE.as_posix()}", future=True)


def _reset_database() -> None:
    Base.metadata.create_all(_sync_engine)
    with _sync_engine.begin() as connection:
        connection.execute(delete(CaiDatDoiTacVanChuyen))
        connection.execute(delete(CaiDatPhuongThucThanhToan))
        connection.execute(delete(CaiDatCuaHang))


@pytest.fixture(autouse=True)
def _fresh_database() -> Iterator[None]:
    _reset_database()
    yield


class PrincipalHolder:
    """Mutable principal used by the test client override."""

    def __init__(self) -> None:
        self.principal: Principal | None = None

    def as_admin(self) -> Principal:
        self.principal = Principal(
            type="user",
            user_id="65f1c2admin",
            role="ADMIN",
            permissions=("*:*",),
            email_verified=True,
        )
        return self.principal

    def as_seller(self) -> Principal:
        self.principal = Principal(
            type="user",
            user_id="65f1c2seller",
            role="SELLER",
            permissions=("product:*", "order:read", "order:update"),
            email_verified=True,
        )
        return self.principal

    def as_customer(self) -> Principal:
        self.principal = Principal(
            type="user",
            user_id="65f1c2cust",
            role="CUSTOMER",
            permissions=("product:read", "order:create", "order:read"),
            email_verified=True,
        )
        return self.principal

    def as_service(self) -> Principal:
        self.principal = Principal(
            type="service",
            client_id="svc-reporting",
            permissions=("store_setting:read",),
        )
        return self.principal

    def clear(self) -> None:
        self.principal = None


@pytest.fixture
def holder() -> PrincipalHolder:
    return PrincipalHolder()


@pytest.fixture
def client(holder: PrincipalHolder) -> Iterator[TestClient]:
    """Test client whose `authenticate` dependency returns `holder.principal`.

    Auth failures (401/403) are evaluated before the database dependency, and
    the database itself is the SQLite test file created above.
    """

    def fake_authenticate() -> Principal:
        if holder.principal is None:
            from systemconfig.errors import ApiError

            raise ApiError(401, "MISSING_TOKEN", "Authentication token required")
        return holder.principal

    app.dependency_overrides[authenticate] = fake_authenticate
    set_verifier(_StubVerifier())
    try:
        with TestClient(app, raise_server_exceptions=False) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(authenticate, None)
        set_verifier(None)


@pytest.fixture
def admin_client(client: TestClient, holder: PrincipalHolder) -> TestClient:
    holder.as_admin()
    return client
