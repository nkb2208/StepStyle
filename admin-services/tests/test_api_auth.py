"""Authentication / authorization behaviour of the admin API surface."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi.testclient import TestClient

if TYPE_CHECKING:
    from tests.conftest import PrincipalHolder


def test_health_is_public(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_missing_token_returns_401_envelope(client: TestClient) -> None:
    response = client.get("/api/admin/products")
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "MISSING_TOKEN"


def test_me_echoes_the_verified_principal(client: TestClient, holder: PrincipalHolder) -> None:
    holder.as_admin()
    response = client.get("/api/admin/me", headers={"Authorization": "Bearer whatever"})
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    principal = body["data"]["principal"]
    assert principal["role"] == "ADMIN"
    assert principal["permissions"] == ["*:*"]
    assert principal["type"] == "user"


def test_customer_is_forbidden_from_admin_resources(
    client: TestClient, holder: PrincipalHolder
) -> None:
    holder.as_customer()
    response = client.get("/api/admin/categories")
    assert response.status_code == 403
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "FORBIDDEN"


def test_seller_is_forbidden_from_user_management(
    client: TestClient, holder: PrincipalHolder
) -> None:
    holder.as_seller()
    response = client.get("/api/admin/users")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"

    # …and from discount management, which is admin-only in the RBAC model.
    assert client.get("/api/admin/discounts").status_code == 403


def test_admin_passes_rbac_and_payload_is_validated(
    client: TestClient, holder: PrincipalHolder
) -> None:
    holder.as_admin()
    response = client.post(
        "/api/admin/products",
        json={
            "name": "Air Force 1",
            "original_price": 1000,
            "sale_price": 2500,  # violates chk_sp_gia
        },
    )
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert any("sale_price" in detail["message"] for detail in body["error"]["details"])


def test_unknown_route_uses_the_error_envelope(client: TestClient) -> None:
    response = client.get("/api/admin/nope")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_method_not_allowed_uses_the_error_envelope(client: TestClient) -> None:
    response = client.delete("/health")
    assert response.status_code == 405
    assert response.json()["error"]["code"] == "METHOD_NOT_ALLOWED"
