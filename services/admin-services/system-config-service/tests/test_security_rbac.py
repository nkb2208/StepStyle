"""RBAC evaluation — must stay in lockstep with the auth service's constants."""

from __future__ import annotations

from systemconfig.security.rbac import (
    has_all_permissions,
    has_any_permission,
    has_permission,
    matches_permission,
)


def test_wildcard_matches_everything() -> None:
    assert matches_permission("*:*", "store_setting:update")
    assert matches_permission("*:*", "store_setting:read")


def test_resource_wildcard_matches_every_action_of_that_resource() -> None:
    assert matches_permission("store_setting:*", "store_setting:read")
    assert matches_permission("store_setting:*", "store_setting:update")
    assert not matches_permission("store_setting:*", "product:read")


def test_exact_match_only_for_other_resources() -> None:
    assert matches_permission("store_setting:read", "store_setting:read")
    assert not matches_permission("store_setting:read", "store_setting:update")


def test_has_permission_with_iterables() -> None:
    assert has_permission(["*:*"], "store_setting:update")
    assert has_permission(["store_setting:read", "order:read"], "order:read")
    assert not has_permission(["store_setting:read"], "store_setting:update")


def test_any_and_all_helpers() -> None:
    granted = ["store_setting:read", "order:read"]
    assert has_any_permission(granted, ["store_setting:update", "order:read"])
    assert not has_all_permissions(granted, ["store_setting:read", "store_setting:update"])
    assert has_all_permissions(granted, ["store_setting:read", "order:read"])


def test_admin_seller_customer_matrix_from_auth_service() -> None:
    admin = ["*:*"]
    seller = ["product:*", "order:read", "order:update"]
    customer = ["product:read", "order:create", "order:read"]

    assert has_permission(admin, "store_setting:update")
    assert has_permission(seller, "product:create")
    assert not has_permission(seller, "store_setting:update")
    assert not has_permission(customer, "store_setting:read")
    assert not has_permission(customer, "store_setting:update")
