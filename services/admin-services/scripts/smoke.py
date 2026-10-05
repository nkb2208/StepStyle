"""End-to-end smoke test for the admin microservice.

Runs the real FastAPI app against a real MySQL instance loaded with
``StepStyle-v2.sql`` and a real JWKS round-trip: a throwaway RSA key pair is
served on a local HTTP server, an access token is signed with it, and the
verification path is exactly the one used against the StepStyle auth service.

Usage::

    mysql -u root < StepStyle-v2.sql        # once
    uv run python scripts/smoke.py
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import threading
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from adminfeat.main import app
from adminfeat.security.deps import get_verifier, set_verifier
from adminfeat.security.jwks import JwksVerifier

ISSUER = "auth.yourdomain.com"
AUDIENCE = "api.yourdomain.com"
KID = "smoke-key"

FAILURES: list[str] = []


# ── Reporting ───────────────────────────────────────────────────────────────


def check(condition: bool, label: str, detail: object = "") -> None:
    if condition:
        print(f"  ✓ {label}")
    else:
        FAILURES.append(label)
        print(f"  ✗ {label}  →  {detail!r}")


def data(response) -> dict:
    body = response.json()
    return body.get("data", {}) if body.get("success") else {}


def error_code(response) -> str:
    return response.json().get("error", {}).get("code", f"<http {response.status_code}>")


def section(title: str) -> None:
    print(f"\n── {title} " + "─" * max(1, 54 - len(title)))


# ── Throwaway JWKS provider ─────────────────────────────────────────────────


class JwksHandler(BaseHTTPRequestHandler):
    jwks: bytes = b"{}"

    def do_GET(self):
        if self.path == "/.well-known/jwks.json":
            payload = self.jwks
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args) -> None:
        pass  # silence the access log


def serve_jwks(private_key) -> ThreadingHTTPServer:
    # PyJWT renders the public half as a JWK document.
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    JwksHandler.jwks = json.dumps(
        {"keys": [{**jwk, "kid": KID, "use": "sig", "alg": "RS256"}]}
    ).encode()
    server = ThreadingHTTPServer(("127.0.0.1", 0), JwksHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def access_token(private_key, **overrides) -> str:
    now = datetime.now(UTC)
    claims = {
        "sub": "smoke-admin",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": now,
        "exp": now + timedelta(minutes=15),
        "jti": "smoke-jti",
        "type": "user",
        "role": "ADMIN",
        "permissions": ["*:*"],
        "emailVerified": True,
    }
    claims.update(overrides)
    return jwt.encode(claims, private_key, algorithm="RS256", headers={"kid": KID})


# ── Scenario ────────────────────────────────────────────────────────────────


def scenario(client: TestClient, headers: dict, key) -> None:
    section("discovery / authentication")
    check(client.get("/health").status_code == 200, "GET /health is public")

    anonymous = client.get("/api/admin/products")
    check(
        anonymous.status_code == 401 and error_code(anonymous) == "MISSING_TOKEN",
        "missing bearer token → 401 MISSING_TOKEN",
        anonymous.text,
    )

    malformed = client.get("/api/admin/products", headers={"Authorization": "Bearer abc.def.ghi"})
    check(
        malformed.status_code == 401 and error_code(malformed) == "INVALID_TOKEN",
        "malformed token → 401 INVALID_TOKEN",
        malformed.text,
    )

    wrong_aud = client.get(
        "/api/admin/products",
        headers={"Authorization": f"Bearer {access_token(key, aud='someone-else')}"},
    )
    check(
        wrong_aud.status_code == 401 and error_code(wrong_aud) == "INVALID_TOKEN",
        "wrong audience → 401 INVALID_TOKEN",
        wrong_aud.text,
    )

    expired = client.get(
        "/api/admin/products",
        headers={
            "Authorization": f"Bearer {access_token(key, exp=datetime.now(UTC) - timedelta(minutes=5))}"
        },
    )
    check(
        expired.status_code == 401 and error_code(expired) == "TOKEN_EXPIRED",
        "expired token → 401 TOKEN_EXPIRED",
        expired.text,
    )

    me = client.get("/api/admin/me", headers=headers)
    principal = me.json().get("data", {}).get("principal", {})
    check(
        me.status_code == 200
        and principal.get("role") == "ADMIN"
        and principal.get("permissions") == ["*:*"],
        "GET /api/admin/me echoes the verified principal",
        me.text,
    )

    section("categories")
    category = client.post(
        "/api/admin/categories",
        headers=headers,
        json={"name": "Giay Nam", "description": "Giay nam dep"},
    )
    check(category.status_code == 201, "create category", category.text)
    category_id = data(category)["category"]["id"]

    child = client.post(
        "/api/admin/categories",
        headers=headers,
        json={"name": "Giay The Thao", "parent_id": category_id},
    )
    check(child.status_code == 201, "create child category", child.text)
    child_id = data(child)["category"]["id"]

    self_parent = client.patch(
        f"/api/admin/categories/{category_id}",
        headers=headers,
        json={"parent_id": category_id},
    )
    check(
        self_parent.status_code == 400 and error_code(self_parent) == "CYCLIC_CATEGORY",
        "a category cannot be its own parent",
        self_parent.text,
    )

    reparent = client.patch(
        f"/api/admin/categories/{category_id}",
        headers=headers,
        json={"parent_id": child_id},
    )
    check(
        reparent.status_code == 400 and error_code(reparent) == "CYCLIC_CATEGORY",
        "category hierarchy rejects cycles",
        reparent.text,
    )

    missing_parent = client.post(
        "/api/admin/categories",
        headers=headers,
        json={"name": "Moc", "parent_id": 999999},
    )
    check(
        missing_parent.status_code == 400 and error_code(missing_parent) == "INVALID_PARENT",
        "unknown parent → 400 INVALID_PARENT",
        missing_parent.text,
    )

    category_list = client.get("/api/admin/categories", headers=headers, params={"q": "nam"})
    check(
        category_list.status_code == 200
        and category_list.json()["success"] is True
        and category_list.json()["data"]["meta"]["total"] >= 1,
        "list categories (success envelope + pagination meta)",
        category_list.text,
    )

    section("products & variants")
    product = client.post(
        "/api/admin/products",
        headers=headers,
        json={
            "name": "Nike Air Force 1",
            "original_price": 2_500_000,
            "sale_price": 1_990_000,
            "description": "Dep",
            "category_id": category_id,
            "image": "https://cdn.example.com/af1.jpg",
        },
    )
    check(product.status_code == 201, "create product", product.text)
    product_id = data(product)["product"]["id"]
    check(
        data(product)["product"]["sale_price"] == 1_990_000
        and data(product)["product"]["category_id"] == category_id,
        "product fields mapped (price, category)",
        product.text,
    )

    bad_price = client.post(
        "/api/admin/products",
        headers=headers,
        json={"name": "Sai gia", "original_price": 100, "sale_price": 200},
    )
    check(bad_price.status_code == 422, "sale_price > original_price → 422", bad_price.text)

    missing_category = client.post(
        "/api/admin/products",
        headers=headers,
        json={"name": "No cat", "category_id": 999999},
    )
    check(
        missing_category.status_code == 400 and error_code(missing_category) == "INVALID_CATEGORY",
        "unknown category → 400 INVALID_CATEGORY",
        missing_category.text,
    )

    variant = client.post(
        f"/api/admin/products/{product_id}/variants",
        headers=headers,
        json={"size": "42", "color": "Trang", "stock": 5},
    )
    check(variant.status_code == 201, "create variant", variant.text)
    variant_id = data(variant)["variant"]["id"]

    duplicate = client.post(
        f"/api/admin/products/{product_id}/variants",
        headers=headers,
        json={"size": "42", "color": "Trang", "stock": 1},
    )
    check(
        duplicate.status_code == 409 and error_code(duplicate) == "DUPLICATE_VARIANT",
        "duplicate size/color → 409 DUPLICATE_VARIANT",
        duplicate.text,
    )

    second_variant = client.post(
        f"/api/admin/products/{product_id}/variants",
        headers=headers,
        json={"size": "43", "color": "Den", "stock": 3},
    )
    check(second_variant.status_code == 201, "create second variant", second_variant.text)
    variant2_id = data(second_variant)["variant"]["id"]

    patched = client.patch(
        f"/api/admin/variants/{variant_id}",
        headers=headers,
        json={"stock": 4, "image": "https://cdn.example.com/v1.jpg"},
    )
    check(
        patched.status_code == 200 and patched.json()["data"]["variant"]["stock"] == 4,
        "update variant stock",
        patched.text,
    )

    product_list = client.get(
        "/api/admin/products", headers=headers, params={"q": "air force", "page_size": 5}
    )
    check(
        product_list.status_code == 200
        and any(item["id"] == product_id for item in product_list.json()["data"]["items"]),
        "product search finds the new product",
        product_list.text,
    )

    section("discounts")
    discount = client.post(
        "/api/admin/discounts",
        headers=headers,
        json={
            "code": "SMOKE10",
            "type": "PERCENT",
            "value": 10,
            "min_order_value": 1_000_000,
            "max_discount": 300_000,
            "quantity": 5,
            "start_date": "2020-01-01T00:00:00",
            "end_date": "2030-01-01T00:00:00",
        },
    )
    check(discount.status_code == 201, "create discount", discount.text)
    discount_id = data(discount)["discount"]["id"]
    check(
        data(discount)["discount"]["code"] == "SMOKE10"
        and data(discount)["discount"]["remaining_quantity"] == 5,
        "discount normalised + counters",
        discount.text,
    )

    percent_too_high = client.post(
        "/api/admin/discounts",
        headers=headers,
        json={"code": "CRAZY", "type": "PERCENT", "value": 150, "quantity": 1},
    )
    check(percent_too_high.status_code == 422, "PERCENT > 100 → 422", percent_too_high.text)

    bad_window = client.post(
        "/api/admin/discounts",
        headers=headers,
        json={
            "code": "BACKWARDS",
            "type": "FIXED_AMOUNT",
            "value": 1000,
            "quantity": 1,
            "start_date": "2030-01-01T00:00:00",
            "end_date": "2020-01-01T00:00:00",
        },
    )
    check(bad_window.status_code == 422, "reversed date window → 422", bad_window.text)

    duplicate_code = client.post(
        "/api/admin/discounts",
        headers=headers,
        json={"code": "smoke10", "type": "PERCENT", "value": 5, "quantity": 1},
    )
    check(
        duplicate_code.status_code == 409 and error_code(duplicate_code) == "DUPLICATE_CODE",
        "duplicate code (case-insensitive) → 409",
        duplicate_code.text,
    )

    below_used = client.patch(
        f"/api/admin/discounts/{discount_id}",
        headers=headers,
        json={"quantity": 1},
    )  # used_quantity is 0 at this point, so this must succeed…
    check(below_used.status_code == 200, "discount quantity can be updated", below_used.text)
    restore_qty = client.patch(
        f"/api/admin/discounts/{discount_id}", headers=headers, json={"quantity": 5}
    )
    check(restore_qty.status_code == 200, "discount quantity restored", restore_qty.text)

    section("users & payment methods")
    user = client.post(
        "/api/admin/users",
        headers=headers,
        json={
            "name": "Nguyen Van A",
            "email": "smoke@example.com",
            "password": "Secret123!",
            "phone": "0900000001",
            "role": "CUSTOMER",
        },
    )
    check(user.status_code == 201, "create user", user.text)
    user_id = data(user)["user"]["id"]
    check(
        "Secret123" not in user.text and "$2b$" in json.dumps(_peek_hash(user_id, client)),
        "password stored as a bcrypt hash and never returned",
        user.text,
    )

    duplicate_user = client.post(
        "/api/admin/users",
        headers=headers,
        json={"name": "Khac", "email": "SMOKE@example.com", "password": "Secret123!"},
    )
    check(
        duplicate_user.status_code == 409 and error_code(duplicate_user) == "DUPLICATE_EMAIL",
        "duplicate email (case-insensitive) → 409",
        duplicate_user.text,
    )

    bad_email = client.post(
        "/api/admin/users",
        headers=headers,
        json={"name": "X", "email": "not-an-email", "password": "Secret123!"},
    )
    check(bad_email.status_code == 422, "invalid email → 422", bad_email.text)

    method = client.post(
        "/api/admin/payment-methods",
        headers=headers,
        json={"name": "COD", "description": "Thanh toan khi nhan hang"},
    )
    check(method.status_code == 201, "create payment method", method.text)
    method_id = data(method)["payment_method"]["id"]

    section("orders")
    order = client.post(
        "/api/admin/orders",
        headers=headers,
        json={
            "customer_id": user_id,
            "recipient_name": "Nguyen Van A",
            "phone": "0900000001",
            "address": "12 Nguyen Hue, Quan 1",
            "shipping_fee": 30_000,
            "discount_id": discount_id,
            "note": "Goi that chat",
            "items": [
                {"variant_id": variant_id, "quantity": 2},
                {"variant_id": variant2_id, "quantity": 1},
            ],
        },
    )
    check(order.status_code == 201, "create order", order.text)
    created = data(order)["order"]
    order_id = created["id"]

    # 2 x 1,990,000 + 1 x 1,990,000 = 5,970,000
    # 10% -> 597,000, capped by max_discount -> 300,000
    # total = 5,970,000 - 300,000 + 30,000 = 5,700,000
    check(
        created["subtotal"] == 5_970_000
        and created["discount_amount"] == 300_000
        and created["shipping_fee"] == 30_000
        and created["total"] == 5_700_000,
        "order totals honour chk_dh_tong and the discount cap",
        created,
    )

    stock_after = client.get(f"/api/admin/variants/{variant_id}", headers=headers).json()["data"][
        "variant"
    ]["stock"]
    check(stock_after == 2, "stock decremented by the ordered quantity (4 → 2)", stock_after)

    used_after = client.get(f"/api/admin/discounts/{discount_id}", headers=headers).json()["data"][
        "discount"
    ]["used_quantity"]
    check(used_after == 1, "discount usage incremented", used_after)

    detail = client.get(f"/api/admin/orders/{order_id}", headers=headers)
    items = detail.json().get("data", {}).get("items", [])
    check(
        detail.status_code == 200
        and len(items) == 2
        and items[0]["product_name"] == "Nike Air Force 1"
        and items[0]["size"] == "42",
        "order detail returns snapshot items",
        detail.text,
    )

    insufficient = client.post(
        "/api/admin/orders",
        headers=headers,
        json={
            "recipient_name": "X",
            "phone": "0900",
            "address": "Y",
            "items": [{"variant_id": variant_id, "quantity": 99}],
        },
    )
    check(
        insufficient.status_code == 409 and error_code(insufficient) == "INSUFFICIENT_STOCK",
        "insufficient stock → 409 INSUFFICIENT_STOCK",
        insufficient.text,
    )

    # Raise the threshold so the next (cheap) order is genuinely below it.
    raise_min = client.patch(
        f"/api/admin/discounts/{discount_id}",
        headers=headers,
        json={"min_order_value": 6_000_000},
    )
    check(raise_min.status_code == 200, "discount minimum can be raised", raise_min.text)

    below_minimum = client.post(
        "/api/admin/orders",
        headers=headers,
        json={
            "recipient_name": "X",
            "phone": "0900",
            "address": "Y",
            "discount_id": discount_id,
            "items": [{"variant_id": variant2_id, "quantity": 1}],
        },
    )
    check(
        below_minimum.status_code == 400 and error_code(below_minimum) == "DISCOUNT_MIN_ORDER",
        "subtotal below discount minimum → 400 DISCOUNT_MIN_ORDER",
        below_minimum.text,
    )

    lower_min = client.patch(
        f"/api/admin/discounts/{discount_id}",
        headers=headers,
        json={"min_order_value": 1_000_000},
    )
    check(lower_min.status_code == 200, "discount minimum restored", lower_min.text)

    edited = client.patch(
        f"/api/admin/orders/{order_id}",
        headers=headers,
        json={"shipping_fee": 50_000, "address": "48 Le Loi, Quan 1"},
    )
    check(
        edited.status_code == 200 and edited.json()["data"]["order"]["total"] == 5_720_000,
        "editing the shipping fee recomputes the total",
        edited.text,
    )

    section("order state machine")
    invalid_jump = client.patch(
        f"/api/admin/orders/{order_id}/status",
        headers=headers,
        json={"status": "DELIVERED"},
    )
    check(
        invalid_jump.status_code == 400 and error_code(invalid_jump) == "INVALID_TRANSITION",
        "PENDING → DELIVERED rejected",
        invalid_jump.text,
    )

    for status in ("PROCESSING", "SHIPPED", "DELIVERED"):
        step = client.patch(
            f"/api/admin/orders/{order_id}/status",
            headers=headers,
            json={"status": status},
        )
        check(
            step.status_code == 200 and step.json()["data"]["order"]["status"] == status,
            f"status transition → {status}",
            step.text,
        )

    section("payments")
    payment = client.post(
        "/api/admin/payments",
        headers=headers,
        json={
            "order_id": order_id,
            "method_id": method_id,
            "amount": 5_720_000,
            "status": "SUCCESS",
            "gateway_txn_id": "txn-001",
        },
    )
    check(payment.status_code == 201, "create payment", payment.text)
    payment_id = data(payment)["payment"]["id"]
    check(
        data(payment)["payment"]["paid_at"] is not None,
        "successful payment records paid_at",
        payment.text,
    )

    duplicate_txn = client.post(
        "/api/admin/payments",
        headers=headers,
        json={
            "order_id": order_id,
            "method_id": method_id,
            "amount": 1000,
            "gateway_txn_id": "txn-001",
        },
    )
    check(
        duplicate_txn.status_code == 409 and error_code(duplicate_txn) == "DUPLICATE_TRANSACTION",
        "duplicate gateway transaction → 409",
        duplicate_txn.text,
    )

    payments_of_order = client.get(
        "/api/admin/payments", headers=headers, params={"order_id": order_id}
    )
    check(
        payments_of_order.status_code == 200
        and payments_of_order.json()["data"]["meta"]["total"] == 1,
        "payments filtered by order",
        payments_of_order.text,
    )

    section("cancellation restores stock & discount use")
    second_order = client.post(
        "/api/admin/orders",
        headers=headers,
        json={
            "recipient_name": "B",
            "phone": "0900",
            "address": "Z",
            "discount_id": discount_id,
            "items": [{"variant_id": variant_id, "quantity": 1}],
        },
    )
    check(second_order.status_code == 201, "create second order", second_order.text)
    second_order_id = data(second_order)["order"]["id"]
    stock_before_cancel = client.get(f"/api/admin/variants/{variant_id}", headers=headers).json()[
        "data"
    ]["variant"]["stock"]

    cancel = client.patch(
        f"/api/admin/orders/{second_order_id}/status",
        headers=headers,
        json={"status": "CANCELLED"},
    )
    stock_after_cancel = client.get(f"/api/admin/variants/{variant_id}", headers=headers).json()[
        "data"
    ]["variant"]["stock"]
    used_after_cancel = client.get(f"/api/admin/discounts/{discount_id}", headers=headers).json()[
        "data"
    ]["discount"]["used_quantity"]

    check(cancel.status_code == 200, "PENDING → CANCELLED allowed", cancel.text)
    check(
        stock_after_cancel == stock_before_cancel + 1,
        "cancellation restores stock",
        (stock_before_cancel, stock_after_cancel),
    )
    check(used_after_cancel == 1, "cancellation frees the discount use", used_after_cancel)

    section("referential integrity")
    delete_variant = client.delete(f"/api/admin/variants/{variant_id}", headers=headers)
    check(
        delete_variant.status_code == 409,
        "variant referenced by an order cannot be deleted → 409",
        delete_variant.text,
    )

    section("dashboard")
    stats = client.get("/api/admin/dashboard/stats", headers=headers)
    body = stats.json().get("data", {})
    check(stats.status_code == 200, "dashboard stats", stats.text)
    check(
        body.get("totals", {}).get("products", 0) >= 1
        and body.get("totals", {}).get("categories", 0) >= 2,
        "totals are populated",
        body.get("totals"),
    )
    check(
        body.get("orders_by_status", {}).get("DELIVERED") == 1,
        "order counts by status",
        body.get("orders_by_status"),
    )
    check(
        body.get("revenue", {}).get("total") == 5_720_000,
        "revenue excludes cancelled orders",
        body.get("revenue"),
    )
    check("low_stock" in body, "low-stock report present", body.get("low_stock"))

    section("store settings")
    initial_settings = client.get("/api/admin/store/settings", headers=headers)
    defaults = data(initial_settings)["store_settings"]
    check(initial_settings.status_code == 200, "GET store settings", initial_settings.text)
    check(
        defaults["store_name"] == "Not configured"
        and defaults["contact_email"] is None
        and defaults["phone"] is None
        and defaults["base_shipping_fee"] == 35_000
        and defaults["free_shipping_threshold"] == 500_000
        and set(defaults["warehouse_address"].values()) == {None},
        "fresh database starts from the documented defaults",
        defaults,
    )
    check(
        [item["code"] for item in defaults["payment_methods"]]
        == ["cod", "card", "momo", "zalopay", "vnpay", "bank_transfer"]
        and all(item["name"] for item in defaults["payment_methods"])
        and not any(item["enabled"] for item in defaults["payment_methods"]),
        "payment methods default to disabled and carry display names",
        defaults["payment_methods"],
    )
    check(
        [item["code"] for item in defaults["shipping_partners"]]
        == ["ghtk", "ghn", "jnt", "viettelpost"]
        and not any(item["enabled"] for item in defaults["shipping_partners"]),
        "shipping partners default to disabled",
        defaults["shipping_partners"],
    )

    updated_settings = client.patch(
        "/api/admin/store/settings",
        headers=headers,
        json={
            "store_name": "StepStyle Store",
            "contact_email": "contact@stepstyle.vn",
            "phone": "0901 234 567",
            "warehouse_address": {
                "detail": "12 Nguyen Hue",
                "ward": "Ben Nghe",
                "district": "Quan 1",
                "province": "Ho Chi Minh",
            },
            "base_shipping_fee": 45_000,
            "free_shipping_threshold": 10_000_000,
            "payment_methods": [
                {"code": "cod", "enabled": True},
                {"code": "momo", "enabled": True},
            ],
            "shipping_partners": [{"code": "ghtk", "enabled": True}],
        },
    )
    persisted = data(updated_settings)["store_settings"]
    check(updated_settings.status_code == 200, "update store settings", updated_settings.text)
    check(
        persisted["store_name"] == "StepStyle Store"
        and persisted["contact_email"] == "contact@stepstyle.vn"
        and persisted["phone"] == "0901234567"  # whitespace normalised, digits kept
        and persisted["base_shipping_fee"] == 45_000
        and persisted["free_shipping_threshold"] == 10_000_000
        and persisted["warehouse_address"]
        == {
            "detail": "12 Nguyen Hue",
            "ward": "Ben Nghe",
            "district": "Quan 1",
            "province": "Ho Chi Minh",
        },
        "store info, warehouse address and money round-trip as integers",
        persisted,
    )
    check(
        {item["code"]: item["enabled"] for item in persisted["payment_methods"]}
        == {
            "cod": True,
            "card": False,
            "momo": True,
            "zalopay": False,
            "vnpay": False,
            "bank_transfer": False,
        }
        and [item["code"] for item in persisted["shipping_partners"] if item["enabled"]]
        == ["ghtk"],
        "toggles persist per stable code, untouched entries keep their state",
        persisted["payment_methods"],
    )

    reloaded = data(client.get("/api/admin/store/settings", headers=headers))["store_settings"]
    check(
        reloaded["store_name"] == "StepStyle Store" and reloaded["base_shipping_fee"] == 45_000,
        "settings survive a reload (stored in the database)",
        reloaded,
    )

    partial_address = client.patch(
        "/api/admin/store/settings",
        headers=headers,
        json={"warehouse_address": {"detail": "48 Le Loi"}},
    )
    check(
        partial_address.status_code == 200
        and data(partial_address)["store_settings"]["warehouse_address"]
        == {
            "detail": "48 Le Loi",
            "ward": "Ben Nghe",
            "district": "Quan 1",
            "province": "Ho Chi Minh",
        },
        "a partial address update leaves the other segments untouched",
        partial_address.text,
    )

    for label, invalid in (
        ("empty store name", {"store_name": "   "}),
        ("null store name", {"store_name": None}),
        ("malformed email", {"contact_email": "not-an-email"}),
        ("non-Vietnamese phone", {"phone": "12345"}),
        ("negative shipping fee", {"base_shipping_fee": -1}),
        ("formatted money string", {"base_shipping_fee": "35.000"}),
        ("fractional amount", {"free_shipping_threshold": 500_000.5}),
        ("unknown payment method", {"payment_methods": [{"code": "paypal", "enabled": True}]}),
        ("unknown shipping partner", {"shipping_partners": [{"code": "best", "enabled": True}]}),
        ("undocumented field", {"api_secret": "hunter2"}),
    ):
        rejected = client.patch("/api/admin/store/settings", headers=headers, json=invalid)
        check(rejected.status_code == 422, f"{label} → 422", rejected.text)

    # ── The order flow consumes the very same settings ──────────────────────
    below_threshold = client.post(
        "/api/admin/orders",
        headers=headers,
        json={
            "recipient_name": "X",
            "phone": "0900000001",
            "address": "12 Nguyen Hue",
            "items": [{"variant_id": variant_id, "quantity": 1}],
        },
    )
    paid_order = data(below_threshold)["order"]
    check(below_threshold.status_code == 201, "order without a shipping fee", below_threshold.text)
    check(
        paid_order["shipping_fee"] == 45_000 and paid_order["total"] == 1_990_000 + 45_000,
        "below free_shipping_threshold the base shipping fee applies",
        paid_order,
    )

    free_threshold = client.patch(
        "/api/admin/store/settings",
        headers=headers,
        json={"free_shipping_threshold": 1_000},
    )
    check(
        free_threshold.status_code == 200,
        "free shipping threshold can be lowered",
        free_threshold.text,
    )

    at_threshold = client.post(
        "/api/admin/orders",
        headers=headers,
        json={
            "recipient_name": "X",
            "phone": "0900000001",
            "address": "12 Nguyen Hue",
            "items": [{"variant_id": variant_id, "quantity": 1}],
        },
    )
    free_order = data(at_threshold)["order"]
    check(at_threshold.status_code == 201, "order at/above the threshold", at_threshold.text)
    check(
        free_order["shipping_fee"] == 0 and free_order["total"] == 1_990_000,
        "orders at/above free_shipping_threshold ship free",
        free_order,
    )

    explicit_fee = client.post(
        "/api/admin/orders",
        headers=headers,
        json={
            "recipient_name": "X",
            "phone": "0900000001",
            "address": "12 Nguyen Hue",
            "shipping_fee": 20_000,
            "items": [{"variant_id": variant2_id, "quantity": 1}],
        },
    )
    overridden = data(explicit_fee)["order"]
    check(explicit_fee.status_code == 201, "order with an explicit fee", explicit_fee.text)
    check(
        overridden["shipping_fee"] == 20_000 and overridden["total"] == 1_990_000 + 20_000,
        "an explicit shipping_fee still wins over the settings",
        overridden,
    )

    for created_order_id in (paid_order["id"], free_order["id"], overridden["id"]):
        removed = client.delete(f"/api/admin/orders/{created_order_id}", headers=headers)
        check(removed.status_code == 200, f"cleanup: delete order {created_order_id}", removed.text)

    section("RBAC")
    customer_token = access_token(
        key, sub="smoke-customer", role="CUSTOMER", permissions=["product:read"]
    )
    forbidden = client.get(
        "/api/admin/users", headers={"Authorization": f"Bearer {customer_token}"}
    )
    check(
        forbidden.status_code == 403 and error_code(forbidden) == "FORBIDDEN",
        "CUSTOMER token forbidden from /users → 403",
        forbidden.text,
    )
    allowed = client.get(
        "/api/admin/products", headers={"Authorization": f"Bearer {customer_token}"}
    )
    check(allowed.status_code == 200, "CUSTOMER token may read products", allowed.text)

    settings_forbidden = client.get(
        "/api/admin/store/settings", headers={"Authorization": f"Bearer {customer_token}"}
    )
    check(
        settings_forbidden.status_code == 403,
        "CUSTOMER token forbidden from store settings → 403",
        settings_forbidden.text,
    )
    settings_write_forbidden = client.patch(
        "/api/admin/store/settings",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"store_name": "Hijacked"},
    )
    check(
        settings_write_forbidden.status_code == 403,
        "CUSTOMER token cannot update store settings → 403",
        settings_write_forbidden.text,
    )

    reader_token = access_token(
        key, sub="smoke-reader", role="STAFF", permissions=["store_setting:read"]
    )
    readable = client.get(
        "/api/admin/store/settings", headers={"Authorization": f"Bearer {reader_token}"}
    )
    check(readable.status_code == 200, "store_setting:read may read the settings", readable.text)
    check(
        data(readable)["store_settings"]["store_name"] == "StepStyle Store",
        "the read-only token sees the configured value",
        readable.text,
    )
    unwritable = client.patch(
        "/api/admin/store/settings",
        headers={"Authorization": f"Bearer {reader_token}"},
        json={"store_name": "Hijacked"},
    )
    check(
        unwritable.status_code == 403,
        "store_setting:read may not update the settings → 403",
        unwritable.text,
    )

    section("cleanup")
    reset_settings = client.patch(
        "/api/admin/store/settings",
        headers=headers,
        json={
            "store_name": "Not configured",
            "contact_email": None,
            "phone": None,
            "warehouse_address": {
                "detail": None,
                "ward": None,
                "district": None,
                "province": None,
            },
            "base_shipping_fee": 35_000,
            "free_shipping_threshold": 500_000,
            "payment_methods": [
                {"code": code, "enabled": False}
                for code in ("cod", "card", "momo", "zalopay", "vnpay", "bank_transfer")
            ],
            "shipping_partners": [
                {"code": code, "enabled": False}
                for code in ("ghtk", "ghn", "jnt", "viettelpost")
            ],
        },
    )
    check(
        reset_settings.status_code == 200
        and data(reset_settings)["store_settings"]["base_shipping_fee"] == 35_000,
        "cleanup: store settings restored to their defaults",
        reset_settings.text,
    )

    for path in (
        f"/api/admin/payments/{payment_id}",
        f"/api/admin/orders/{second_order_id}",
        f"/api/admin/orders/{order_id}",
        f"/api/admin/variants/{variant2_id}",
        f"/api/admin/products/{product_id}",
        f"/api/admin/categories/{child_id}",
        f"/api/admin/categories/{category_id}",
        f"/api/admin/discounts/{discount_id}",
        f"/api/admin/payment-methods/{method_id}",
        f"/api/admin/users/{user_id}",
    ):
        response = client.delete(path, headers=headers)
        check(response.status_code == 200, f"DELETE {path.split('/admin/')[1]}", response.text)


def _connection():
    import pymysql

    from adminfeat.config import get_settings

    url = get_settings().database_url.replace("mysql+aiomysql://", "")
    user_part, host_part = url.rsplit("@", 1)
    username, password = user_part.split(":", 1)
    database = host_part.split("/", 1)[1]
    hostname, port = host_part.split("/", 1)[0].split(":")
    return pymysql.connect(
        host=hostname,
        port=int(port),
        user=username,
        password=password,
        database=database,
    )


def pre_clean() -> None:
    """Remove leftovers of a previously interrupted run (marker rows only)."""
    connection = _connection()
    try:
        with connection.cursor() as cursor:
            for statement in (
                "DELETE t FROM thanhtoan t JOIN donhang o ON o.ma_don_hang=t.ma_don_hang "
                "WHERE o.ten_nguoi_nhan IN ('Nguyen Van A','B','X')",
                "DELETE c FROM chitietdonhang c JOIN donhang o ON o.ma_don_hang=c.ma_don_hang "
                "WHERE o.ten_nguoi_nhan IN ('Nguyen Van A','B','X')",
                "DELETE FROM donhang WHERE ten_nguoi_nhan IN ('Nguyen Van A','B','X')",
                "DELETE bt FROM bienthesanpham bt JOIN sanpham p ON p.ma_san_pham=bt.ma_san_pham "
                "WHERE p.ten_san_pham='Nike Air Force 1'",
                "DELETE FROM sanpham WHERE ten_san_pham='Nike Air Force 1'",
                "DELETE FROM danhmuc WHERE ten_danh_muc IN ('Giay Nam','Giay The Thao')",
                "DELETE FROM magiamgia WHERE code_giam_gia IN ('SMOKE10','CRAZY','BACKWARDS')",
                "DELETE FROM phuongthucthanhtoan WHERE ten_phuong_thuc='COD'",
                "DELETE FROM nguoidung WHERE email LIKE '%smoke@example.com'",
                # Store settings start from the documented defaults every run.
                "DELETE FROM caidatcuahang",
            ):
                cursor.execute(statement)
        connection.commit()
    finally:
        connection.close()


def _peek_hash(user_id: int, client: TestClient) -> str:
    """The API never returns `mat_khau`, so read it straight from the table."""
    connection = _connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT mat_khau FROM nguoidung WHERE ma_nguoi_dung=%s", (user_id,))
            row = cursor.fetchone()
        return row[0] if row else ""
    finally:
        connection.close()


def main() -> int:
    pre_clean()
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    server = serve_jwks(key)
    jwks_url = f"http://127.0.0.1:{server.server_address[1]}/.well-known/jwks.json"

    set_verifier(
        JwksVerifier(jwks_url=jwks_url, issuer=ISSUER, audience=AUDIENCE, refresh_seconds=60)
    )
    asyncio.run(get_verifier().init())
    headers = {"Authorization": f"Bearer {access_token(key)}"}

    try:
        with TestClient(
            app, raise_server_exceptions=os.environ.get("SMOKE_RAISE") == "1"
        ) as client:
            scenario(client, headers, key)
    finally:
        set_verifier(None)
        server.shutdown()

    print("\n" + "─" * 60)
    if FAILURES:
        print(f"FAILED: {len(FAILURES)} check(s)")
        for item in FAILURES:
            print(f"  ✗ {item}")
        return 1
    print("ALL SMOKE CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
