import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../infrastructure/jwt";
import { isAccessTokenRevoked } from "../infrastructure/database";
import type { Permission, Role } from "../modules/authorization/roles";

export interface AuthenticatedUser {
  userId: string;
  role: Role;
  permissions: Permission[];
  emailVerified: boolean;
}

export interface AuthenticatedService {
  clientId: string;
  permissions: Permission[];
}

export type AuthenticatedPrincipal =
  | (AuthenticatedUser & { type: "user"; jti: string })
  | (AuthenticatedService & { type: "service"; jti: string });

export interface AuthenticatedRequest extends Request {
  principal?: AuthenticatedPrincipal;
  user?: AuthenticatedUser;
}

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

async function buildPrincipal(req: Request): Promise<AuthenticatedPrincipal> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw Object.assign(new Error("Authentication token required"), { code: "MISSING_TOKEN", status: 401 });
  }

  const token = authHeader.slice(7);
  const claims = verifyAccessToken(token);

  if (await isAccessTokenRevoked(claims.jti)) {
    throw Object.assign(new Error("Token has been revoked"), { code: "TOKEN_REVOKED", status: 401 });
  }

  if (claims.type === "service") {
    return {
      type: "service",
      clientId: claims.sub,
      permissions: claims.permissions ?? [],
      jti: claims.jti,
    };
  }

  return {
    type: "user",
    userId: claims.sub,
    role: claims.role!,
    permissions: claims.permissions ?? [],
    emailVerified: claims.emailVerified ?? false,
    jti: claims.jti,
  };
}

/**
 * Authentication for routes hosted by the Authentication Service itself.
 *
 * Verifies the bearer token (RS256 signature, exp, iss, aud) and additionally
 * consults the local revocation denylist so that logged-out access tokens are
 * rejected immediately.
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const principal = await buildPrincipal(req);
    req.principal = principal;
    if (principal.type === "user") req.user = principal;
    next();
  } catch (error) {
    const err = error as Error & { code?: string; status?: number };
    if (err.code === "MISSING_TOKEN") {
      sendError(res, 401, "MISSING_TOKEN", "Authentication token required");
      return;
    }
    if (err.code === "TOKEN_REVOKED") {
      sendError(res, 401, "TOKEN_REVOKED", "Token has been revoked");
      return;
    }
    if (err.name === "TokenExpiredError") {
      sendError(res, 401, "TOKEN_EXPIRED", "The provided JWT access token has expired");
      return;
    }
    sendError(res, 401, "INVALID_TOKEN", "The provided JWT access token is invalid or expired.");
  }
};

/** Attaches the principal when a valid token is present, but never rejects the request. */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const principal = await buildPrincipal(req);
    req.principal = principal;
    if (principal.type === "user") req.user = principal;
  } catch {
    // Token absent or invalid — continue unauthenticated.
  }
  next();
};
