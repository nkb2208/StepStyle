"""End-to-end tests of the settings API over the SQLite test database."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi.testclient import TestClient

from systemconfig.security import Principal

if TYPE_CHECKING:
    from tests.conftest import PrincipalHolder

STORE = "/api/v1/settings/store"
PAYMENTS = "/api/v1/settings/payment-methods"
PARTNERS = "/api/v1/settings/shipping-partners"
PUBLIC = "/api/v1/settings/public"


def data(response) -> Any:
    return response.json()["data"]


def find(items: list[dict[str, Any]], code: str) -> dict[str, Any]:
    return next(item for item in items if item["code"] == code)


# ── Authentication / authorization ──────────────────────────────────────────


def test_endpoints_require_authentication(client: TestClient) -> None:
    requests = [
        ("get", STORE, None),
        ("put", STORE, {}),
        ("get", PAYMENTS, None),
        ("get", PARTNERS, None),
    ]
    for method, path, payload in requests:
        if payload is None:
            response = getattr(client, method)(path)
        else:
            response = getattr(client, method)(path, json=payload)
        assert response.status_code == 401, path
        assert response.json()["error"]["code"] == "MISSING_TOKEN"


def test_customer_is_forbidden(client: TestClient, holder: PrincipalHolder) -> None:
    holder.as_customer()
    assert client.get(STORE).status_code == 403
    assert client.put(STORE, json={"store_name": "Hacked"}).status_code == 403
    assert client.get(PAYMENTS).status_code == 403
    assert client.put(PAYMENTS + "/1", json={"enabled": True}).status_code == 403
    assert client.get(PARTNERS).status_code == 403
    assert client.put(PARTNERS + "/1", json={"enabled": True}).status_code == 403


def test_seller_is_forbidden(client: TestClient, holder: PrincipalHolder) -> None:
    holder.as_seller()
    assert client.get(STORE).status_code == 403
    assert client.put(STORE, json={"store_name": "Hacked"}).status_code == 403


def test_read_only_permission_does_not_grant_update(
    client: TestClient, holder: PrincipalHolder
) -> None:
    holder.principal = Principal(
        type="service", client_id="svc-reporting", permissions=("store_setting:read",)
    )
    # Reads are allowed for a service client holding `store_setting:read`…
    assert client.get(STORE).status_code == 200
    # …but writes require `store_setting:update`.
    response = client.put(STORE, json={"store_name": "Svc"})
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_me_echoes_the_verified_principal(client: TestClient, holder: PrincipalHolder) -> None:
    holder.as_admin()
    response = client.get("/api/v1/me")
    assert response.status_code == 200
    principal = data(response)["principal"]
    assert principal["role"] == "ADMIN"
    assert principal["permissions"] == ["*:*"]


# ── Public storefront configuration ─────────────────────────────────────────


def test_public_settings_need_no_authentication(client: TestClient) -> None:
    # `holder` carries no principal: every authenticated endpoint would 401,
    # but the storefront endpoint is public.
    response = client.get(PUBLIC)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    storefront = body["data"]
    assert storefront["store_name"] == "Not configured"
    assert storefront["base_shipping_fee"] == 35000
    assert storefront["free_shipping_threshold"] == 500000
    # Nothing is offered until an administrator enables it.
    assert storefront["payment_methods"] == []
    assert storefront["shipping_partners"] == []


def test_public_settings_expose_only_enabled_options(admin_client: TestClient) -> None:
    cod = find(data(admin_client.get(PAYMENTS)), "cod")
    admin_client.put(f"{PAYMENTS}/{cod['id']}", json={"enabled": True})
    ghn = find(data(admin_client.get(PARTNERS)), "ghn")
    admin_client.put(f"{PARTNERS}/{ghn['id']}", json={"enabled": True})

    storefront = data(admin_client.get(PUBLIC))
    assert [method["code"] for method in storefront["payment_methods"]] == ["cod"]
    assert [partner["code"] for partner in storefront["shipping_partners"]] == ["ghn"]
    # The public projection carries no internal id and no `enabled` flag.
    assert set(storefront["payment_methods"][0]) == {"code", "name", "description"}
    assert set(storefront["shipping_partners"][0]) == {"code", "name", "description"}


def test_public_settings_reflect_updated_shipping_rules(admin_client: TestClient) -> None:
    admin_client.put(
        STORE,
        json={"base_shipping_fee": 40000, "free_shipping_threshold": 600000},
    )
    storefront = data(admin_client.get(PUBLIC))
    assert storefront["base_shipping_fee"] == 40000
    assert storefront["free_shipping_threshold"] == 600000


# ── Store information ───────────────────────────────────────────────────────


def test_get_store_returns_defaults(admin_client: TestClient) -> None:
    response = admin_client.get(STORE)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    store = body["data"]
    assert store["store_name"] == "Not configured"
    assert store["contact_email"] is None
    assert store["phone"] is None
    assert store["warehouse_address"] == {
        "detail": None,
        "ward": None,
        "district": None,
        "province": None,
    }
    assert store["base_shipping_fee"] == 35000
    assert store["free_shipping_threshold"] == 500000
    assert "created_at" in store and "updated_at" in store


def test_update_store_name_and_shipping_settings(admin_client: TestClient) -> None:
    response = admin_client.put(
        STORE,
        json={
            "store_name": "StepStyle",
            "base_shipping_fee": 40000,
            "free_shipping_threshold": 600000,
        },
    )
    assert response.status_code == 200
    store = data(response)
    assert store["store_name"] == "StepStyle"
    assert store["base_shipping_fee"] == 40000
    assert store["free_shipping_threshold"] == 600000

    # Persisted: a fresh GET returns the new values.
    refreshed = data(admin_client.get(STORE))
    assert refreshed["store_name"] == "StepStyle"
    assert refreshed["base_shipping_fee"] == 40000


def test_update_store_is_partial(admin_client: TestClient) -> None:
    admin_client.put(STORE, json={"store_name": "StepStyle", "base_shipping_fee": 42000})
    response = admin_client.put(STORE, json={"contact_email": "shop@stepstyle.vn"})
    store = data(response)
    # Untouched fields keep their value (not overwritten / not reset).
    assert store["store_name"] == "StepStyle"
    assert store["base_shipping_fee"] == 42000
    assert store["contact_email"] == "shop@stepstyle.vn"


def test_update_store_only_keeps_a_single_row(admin_client: TestClient) -> None:
    for _ in range(3):
        admin_client.put(STORE, json={"store_name": "StepStyle"})
    # A follow-up read still resolves to a single, configured store.
    assert data(admin_client.get(STORE))["store_name"] == "StepStyle"


def test_negative_shipping_fee_is_rejected(admin_client: TestClient) -> None:
    response = admin_client.put(STORE, json={"base_shipping_fee": -1})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_negative_free_shipping_threshold_is_rejected(admin_client: TestClient) -> None:
    response = admin_client.put(STORE, json={"free_shipping_threshold": -100})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_update_store_rejects_blank_name_and_bad_email(admin_client: TestClient) -> None:
    assert admin_client.put(STORE, json={"store_name": "  "}).status_code == 422
    assert admin_client.put(STORE, json={"contact_email": "nope"}).status_code == 422
    assert admin_client.put(STORE, json={"phone": "12345"}).status_code == 422


def test_update_store_rejects_unknown_field(admin_client: TestClient) -> None:
    response = admin_client.put(STORE, json={"api_secret": "hunter2"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_update_store_phone_is_normalised(admin_client: TestClient) -> None:
    store = data(admin_client.put(STORE, json={"phone": "0901 234 567"}))
    assert store["phone"] == "0901234567"


def test_update_store_warehouse_address_is_partial(admin_client: TestClient) -> None:
    admin_client.put(
        STORE,
        json={
            "warehouse_address": {
                "detail": "12 Nguyen Hue",
                "ward": "Ben Nghe",
                "district": "Quan 1",
                "province": "Ho Chi Minh",
            }
        },
    )
    store = data(admin_client.put(STORE, json={"warehouse_address": {"detail": "99 Le Loi"}}))
    assert store["warehouse_address"] == {
        "detail": "99 Le Loi",
        "ward": "Ben Nghe",
        "district": "Quan 1",
        "province": "Ho Chi Minh",
    }


# ── Payment methods ─────────────────────────────────────────────────────────


def test_list_payment_methods_returns_the_catalog(admin_client: TestClient) -> None:
    response = admin_client.get(PAYMENTS)
    assert response.status_code == 200
    methods = data(response)
    codes = {method["code"] for method in methods}
    assert codes == {"cod", "card", "momo", "zalopay", "vnpay", "bank_transfer"}
    for method in methods:
        assert isinstance(method["id"], int)
        assert method["name"]
        assert method["enabled"] is False  # nothing is enabled by default


def test_enable_and_disable_momo_and_vnpay(admin_client: TestClient) -> None:
    methods = data(admin_client.get(PAYMENTS))
    momo = find(methods, "momo")
    vnpay = find(methods, "vnpay")

    enabled = admin_client.put(PAYMENTS + f"/{momo['id']}", json={"enabled": True})
    assert enabled.status_code == 200
    assert data(enabled)["enabled"] is True

    enabled_vnpay = admin_client.put(PAYMENTS + f"/{vnpay['id']}", json={"enabled": True})
    assert data(enabled_vnpay)["enabled"] is True

    # Persisted across requests.
    refreshed = data(admin_client.get(PAYMENTS))
    assert find(refreshed, "momo")["enabled"] is True
    assert find(refreshed, "vnpay")["enabled"] is True

    # Disabling flips the flag back and never deletes the row.
    disabled = admin_client.put(PAYMENTS + f"/{momo['id']}", json={"enabled": False})
    assert data(disabled)["enabled"] is False
    refreshed = data(admin_client.get(PAYMENTS))
    assert find(refreshed, "momo")["enabled"] is False
    assert len(refreshed) == 6


def test_update_payment_method_name(admin_client: TestClient) -> None:
    momo = find(data(admin_client.get(PAYMENTS)), "momo")
    response = admin_client.put(
        PAYMENTS + f"/{momo['id']}", json={"name": "Ví MoMo", "description": None}
    )
    assert response.status_code == 200
    updated = data(response)
    assert updated["name"] == "Ví MoMo"
    assert updated["description"] is None


def test_update_payment_method_requires_a_field(admin_client: TestClient) -> None:
    momo = find(data(admin_client.get(PAYMENTS)), "momo")
    response = admin_client.put(PAYMENTS + f"/{momo['id']}", json={})
    assert response.status_code == 422


def test_unknown_payment_method_returns_404(admin_client: TestClient) -> None:
    response = admin_client.put(PAYMENTS + "/999999", json={"enabled": True})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PAYMENT_METHOD_NOT_FOUND"


def test_payment_method_id_must_be_a_positive_integer(admin_client: TestClient) -> None:
    assert admin_client.put(PAYMENTS + "/0", json={"enabled": True}).status_code == 422
    assert admin_client.put(PAYMENTS + "/-3", json={"enabled": True}).status_code == 422
    assert admin_client.put(PAYMENTS + "/abc", json={"enabled": True}).status_code == 422


# ── Shipping partners ───────────────────────────────────────────────────────


def test_list_shipping_partners_returns_the_catalog(admin_client: TestClient) -> None:
    partners = data(admin_client.get(PARTNERS))
    assert {partner["code"] for partner in partners} == {"ghtk", "ghn", "jnt", "viettelpost"}
    assert all(partner["enabled"] is False for partner in partners)
    assert all(isinstance(partner["id"], int) for partner in partners)


def test_enable_and_disable_a_shipping_partner(admin_client: TestClient) -> None:
    ghtk = find(data(admin_client.get(PARTNERS)), "ghtk")
    enabled = admin_client.put(PARTNERS + f"/{ghtk['id']}", json={"enabled": True})
    assert data(enabled)["enabled"] is True
    assert find(data(admin_client.get(PARTNERS)), "ghtk")["enabled"] is True

    disabled = admin_client.put(PARTNERS + f"/{ghtk['id']}", json={"enabled": False})
    assert data(disabled)["enabled"] is False
    # The carrier is never deleted when disabled.
    assert len(data(admin_client.get(PARTNERS))) == 4


def test_unknown_shipping_partner_returns_404(admin_client: TestClient) -> None:
    response = admin_client.put(PARTNERS + "/999999", json={"enabled": True})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SHIPPING_PARTNER_NOT_FOUND"


def test_shipping_partner_id_must_be_a_positive_integer(admin_client: TestClient) -> None:
    assert admin_client.put(PARTNERS + "/0", json={"enabled": True}).status_code == 422
    assert admin_client.put(PARTNERS + "/abc", json={"enabled": True}).status_code == 422


# ── Non-functional ──────────────────────────────────────────────────────────


def test_unknown_route_uses_the_error_envelope(admin_client: TestClient) -> None:
    response = admin_client.get("/api/v1/settings/nope")
    assert response.status_code == 404
    assert response.json()["success"] is False
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_responses_never_leak_configuration_secrets(admin_client: TestClient) -> None:
    payloads = [
        admin_client.get(STORE).text,
        admin_client.get(PAYMENTS).text,
        admin_client.get(PARTNERS).text,
    ]
    for body in payloads:
        lowered = body.lower()
        assert "secret" not in lowered
        assert "token" not in lowered
        assert "password" not in lowered
