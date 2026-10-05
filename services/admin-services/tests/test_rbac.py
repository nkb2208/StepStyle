"""RBAC evaluation — must stay in lockstep with the auth service's constants."""

from adminfeat.security.rbac import (
    has_all_permissions,
    has_any_permission,
    has_permission,
    matches_permission,
)


def test_wildcard_matches_everything():
    assert matches_permission("*:*", "product:delete")
    assert matches_permission("*:*", "dashboard:read")


def test_resource_wildcard_matches_every_action_of_that_resource():
    assert matches_permission("product:*", "product:create")
    assert matches_permission("product:*", "product:delete")
    assert not matches_permission("product:*", "order:read")


def test_exact_match_only_for_other_resources():
    assert matches_permission("order:read", "order:read")
    assert not matches_permission("order:read", "order:update")


def test_has_permission_with_iterables():
    assert has_permission(["*:*"], "user:delete")
    assert has_permission(["product:read", "order:read"], "order:read")
    assert not has_permission(["product:read"], "order:read")


def test_any_and_all_helpers():
    granted = ["product:read", "order:read"]
    assert has_any_permission(granted, ["order:read", "user:read"])
    assert not has_all_permissions(granted, ["order:read", "user:read"])
    assert has_all_permissions(granted, ["product:read", "order:read"])


def test_admin_seller_customer_matrix_from_auth_service():
    admin = ["*:*"]
    seller = ["product:*", "order:read", "order:update"]
    customer = ["product:read", "order:create", "order:read"]

    assert has_permission(admin, "user:delete")
    assert has_permission(seller, "product:create")
    assert not has_permission(seller, "user:read")
    assert not has_permission(customer, "product:create")
    assert has_permission(customer, "product:read")
