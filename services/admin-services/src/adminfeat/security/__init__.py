from adminfeat.security.deps import (
    Principal,
    authenticate,
    get_verifier,
    principal_from_claims,
    require_admin,
    require_permission,
    require_role,
    set_verifier,
)
from adminfeat.security.jwks import JwksVerifier, TokenVerificationError
from adminfeat.security.rbac import (
    has_all_permissions,
    has_any_permission,
    has_permission,
    matches_permission,
)

__all__ = [
    "JwksVerifier",
    "Principal",
    "TokenVerificationError",
    "authenticate",
    "get_verifier",
    "has_all_permissions",
    "has_any_permission",
    "has_permission",
    "matches_permission",
    "principal_from_claims",
    "require_admin",
    "require_permission",
    "require_role",
    "set_verifier",
]
