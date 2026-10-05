"""RBAC permission evaluation — port of the auth service's ``auth-types`` logic.

The access token issued by the StepStyle auth service carries a ``permissions``
array. ``ADMIN`` holds the wildcard ``*:*``, so every admin endpoint is
reachable by administrators while sellers/customers are limited to the
permissions their role was granted.
"""

from __future__ import annotations

from collections.abc import Iterable


def matches_permission(granted: str, required: str) -> bool:
    if granted == "*:*":
        return True
    if granted == required:
        return True
    resource = required.split(":", 1)[0]
    return granted == f"{resource}:*"


def has_permission(granted: Iterable[str], required: str) -> bool:
    return any(matches_permission(item, required) for item in granted)


def has_any_permission(granted: Iterable[str], required: Iterable[str]) -> bool:
    granted_list = list(granted)
    return any(has_permission(granted_list, item) for item in required)


def has_all_permissions(granted: Iterable[str], required: Iterable[str]) -> bool:
    granted_list = list(granted)
    return all(has_permission(granted_list, item) for item in required)
