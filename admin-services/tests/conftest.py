"""Shared fixtures: an app test client with a controllable principal."""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from adminfeat.main import app
from adminfeat.security.deps import Principal, authenticate, set_verifier


class PrincipalHolder:
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

    def clear(self) -> None:
        self.principal = None


@pytest.fixture
def holder() -> PrincipalHolder:
    return PrincipalHolder()


@pytest.fixture
def client(holder: PrincipalHolder) -> Iterator[TestClient]:
    """Test client whose `authenticate` dependency returns `holder.principal`.

    Auth failures (401/403) are evaluated before any database dependency, so
    these tests never need a running MySQL instance.
    """

    def fake_authenticate() -> Principal:
        if holder.principal is None:
            from adminfeat.errors import ApiError

            raise ApiError(401, "MISSING_TOKEN", "Authentication token required")
        return holder.principal

    app.dependency_overrides[authenticate] = fake_authenticate
    set_verifier(None)
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
