import type { Permission, Role } from "./types";

export const ROLES = {
  ADMIN: "ADMIN",
  SELLER: "SELLER",
  CUSTOMER: "CUSTOMER",
} as const;

export const PERMISSIONS = {
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",

  PRODUCT_READ: "product:read",
  PRODUCT_CREATE: "product:create",
  PRODUCT_UPDATE: "product:update",
  PRODUCT_DELETE: "product:delete",

  ORDER_READ: "order:read",
  ORDER_CREATE: "order:create",
  ORDER_UPDATE: "order:update",
  ORDER_DELETE: "order:delete",
} as const;

/**
 * Canonical role → permission mapping.
 *
 * - ADMIN    → system-wide wildcard `*:*`
 * - SELLER   → `product:*`, `order:read`, `order:update`
 * - CUSTOMER → `product:read`, `order:create`, `order:read`
 *
 * Wildcard semantics supported when evaluating:
 * - `*:*`      matches every permission
 * - `<resource>:*` matches every action on that resource
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ["*:*"],
  SELLER: ["product:*", "order:read", "order:update"],
  CUSTOMER: ["product:read", "order:create", "order:read"],
};

export function matchesPermission(granted: Permission, required: Permission): boolean {
  if (granted === "*:*") return true;
  if (granted === required) return true;
  const [resource] = required.split(":");
  return granted === `${resource}:*`;
}

export function hasPermission(grantedPermissions: Permission[], required: Permission): boolean {
  return grantedPermissions.some((granted) => matchesPermission(granted, required));
}

export function hasAnyPermission(grantedPermissions: Permission[], required: Permission[]): boolean {
  return required.some((permission) => hasPermission(grantedPermissions, permission));
}

export function hasAllPermissions(grantedPermissions: Permission[], required: Permission[]): boolean {
  return required.every((permission) => hasPermission(grantedPermissions, permission));
}

export function getPermissionsForRole(role: Role): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

export function isRole(value: unknown): value is Role {
  return value === ROLES.ADMIN || value === ROLES.SELLER || value === ROLES.CUSTOMER;
}
