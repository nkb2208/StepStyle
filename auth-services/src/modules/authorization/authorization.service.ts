import { getPermissionsForRole, hasAllPermissions, hasAnyPermission, matchesPermission } from "./permissions";
import type { Permission, Role } from "./roles";
import { ROLES } from "./roles";

/**
 * Centralized RBAC evaluation. Role logic is never hard-coded in route
 * handlers — routes only declare which role/permission they require through
 * the authorization middlewares.
 */
export class AuthorizationService {
  static getPermissions(role: Role): Permission[] {
    return getPermissionsForRole(role);
  }

  static can(role: Role, permission: Permission): boolean {
    return getPermissionsForRole(role).some((granted) => matchesPermission(granted, permission));
  }

  static canAny(role: Role, permissions: Permission[]): boolean {
    return hasAnyPermission(getPermissionsForRole(role), permissions);
  }

  static canAll(role: Role, permissions: Permission[]): boolean {
    return hasAllPermissions(getPermissionsForRole(role), permissions);
  }

  static isRoleAllowed(role: Role, allowed: Role[]): boolean {
    return allowed.includes(role);
  }

  static allRoles(): Role[] {
    return [ROLES.ADMIN, ROLES.SELLER, ROLES.CUSTOMER];
  }
}
