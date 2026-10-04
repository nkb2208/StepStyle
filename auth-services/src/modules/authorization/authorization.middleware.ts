import type { NextFunction, Request, Response } from "express";
import { AuthorizationService } from "./authorization.service";
import type { Permission, Role } from "./roles";
import { isRole } from "./roles";
import type { AuthenticatedRequest } from "../../middleware/authenticate";

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

function requireUser(req: Request, res: Response): AuthenticatedRequest["user"] | null {
  const authenticated = req as AuthenticatedRequest;
  if (!authenticated.principal) {
    sendError(res, 401, "UNAUTHORIZED", "Authentication required");
    return null;
  }
  if (authenticated.principal.type !== "user") {
    sendError(res, 403, "FORBIDDEN", "Only user principals can access this resource");
    return null;
  }
  if (!authenticated.user) {
    sendError(res, 401, "UNAUTHORIZED", "Authentication required");
    return null;
  }
  return authenticated.user;
}

/** Restrict a route to the given roles (ADMIN, SELLER, CUSTOMER). */
export function authorizeRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = requireUser(req, res);
    if (!user) return;
    if (!isRole(user.role) || !AuthorizationService.isRoleAllowed(user.role, roles)) {
      sendError(res, 403, "FORBIDDEN", "Insufficient role permissions for this resource");
      return;
    }
    next();
  };
}

/** Require at least ONE of the given permissions (RBAC wildcards are honoured). */
export function authorizePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = requireUser(req, res);
    if (!user) return;
    if (!AuthorizationService.canAny(user.role, permissions)) {
      sendError(res, 403, "FORBIDDEN", "Missing required permissions for this resource");
      return;
    }
    next();
  };
}

/** Require ALL of the given permissions. */
export function authorizeAllPermissions(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = requireUser(req, res);
    if (!user) return;
    if (!AuthorizationService.canAll(user.role, permissions)) {
      sendError(res, 403, "FORBIDDEN", "Missing required permissions for this resource");
      return;
    }
    next();
  };
}
