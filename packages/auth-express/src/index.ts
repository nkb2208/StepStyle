import type { NextFunction, Request, Response } from "express";
import {
  JwksVerifier,
  TokenVerificationError,
  hasPermission,
  hasAnyPermission,
} from "@ngocanh-auth/auth-types";
import type {
  AuthenticatedPrincipal,
  AuthenticatedUser,
  Role,
  VerifierOptions,
} from "@ngocanh-auth/auth-types";

export interface AuthGuardOptions extends VerifierOptions {
  /** Optional hook for services that also want to enforce token revocation (jti denylist). */
  checkRevocation?: (jti: string) => Promise<boolean>;
}

export interface AuthenticatedRequest extends Request {
  principal?: AuthenticatedPrincipal;
  user?: AuthenticatedUser;
}

type RequestHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

let verifier: JwksVerifier | null = null;
let revocationChecker: ((jti: string) => Promise<boolean>) | null = null;

function defaultOptions(): AuthGuardOptions {
  return {
    jwksUrl: process.env.JWKS_URL ?? "http://localhost:4000/.well-known/jwks.json",
    issuer: process.env.JWT_ISSUER ?? "auth.yourdomain.com",
    audience: process.env.JWT_AUDIENCE ?? "api.yourdomain.com",
    clockToleranceSeconds: 5,
  };
}

/** Explicitly configure verification (recommended at service startup for fail-fast JWKS checks). */
export async function configureAuth(options: AuthGuardOptions): Promise<void> {
  verifier = new JwksVerifier(options);
  revocationChecker = options.checkRevocation ?? null;
  await verifier.init();
}

export function resetAuthGuard(): void {
  verifier = null;
  revocationChecker = null;
}

function getVerifier(): JwksVerifier {
  if (!verifier) verifier = new JwksVerifier(defaultOptions());
  return verifier;
}

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

/**
 * Authentication middleware for downstream microservices.
 *
 * Execution flow:
 *   Request → Authorization: Bearer <JWT>
 *   → verify RS256 signature + exp + iss + aud (+ optional jti revocation)
 *   → attach principal to request context → route handler
 */
export function authenticate(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        sendError(res, 401, "MISSING_TOKEN", "Authentication token required");
        return;
      }

      const token = authHeader.slice(7);
      const payload = await getVerifier().verify(token);

      if (revocationChecker && (await revocationChecker(payload.jti))) {
        sendError(res, 401, "TOKEN_REVOKED", "The provided JWT access token has been revoked");
        return;
      }

      const authenticatedRequest = req as AuthenticatedRequest;
      if (payload.type === "service") {
        authenticatedRequest.principal = {
          type: "service",
          clientId: payload.sub,
          permissions: payload.permissions ?? [],
        };
      } else {
        authenticatedRequest.principal = {
          type: "user",
          userId: payload.sub,
          role: payload.role!,
          permissions: payload.permissions ?? [],
          emailVerified: payload.emailVerified ?? false,
        };
        authenticatedRequest.user = authenticatedRequest.principal;
      }

      next();
    } catch (error) {
      if (error instanceof TokenVerificationError) {
        if (error.code === "TOKEN_EXPIRED") {
          sendError(res, 401, "TOKEN_EXPIRED", error.message);
          return;
        }
        if (error.code === "JWKS_UNAVAILABLE") {
          sendError(res, 503, "SERVICE_UNAVAILABLE", "Token verification is temporarily unavailable");
          return;
        }
        sendError(res, 401, "INVALID_TOKEN", "The provided JWT access token is invalid or expired.");
        return;
      }
      sendError(res, 401, "INVALID_TOKEN", "The provided JWT access token is invalid or expired.");
    }
  };
}

function getPrincipal(req: Request, res: Response): AuthenticatedPrincipal | null {
  const principal = (req as AuthenticatedRequest).principal;
  if (!principal) {
    sendError(res, 401, "UNAUTHORIZED", "Authentication required");
    return null;
  }
  return principal;
}

/** Restrict a route to one or more roles. */
export function authorizeRole(...roles: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const principal = getPrincipal(req, res);
    if (!principal) return;
    if (principal.type !== "user" || !roles.includes(principal.role)) {
      sendError(res, 403, "FORBIDDEN", "Insufficient role permissions for this resource");
      return;
    }
    next();
  };
}

/** Require at least ONE of the given permissions (wildcards from the RBAC model are honoured). */
export function authorizePermission(...permissions: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const principal = getPrincipal(req, res);
    if (!principal) return;
    if (!hasAnyPermission(principal.permissions, permissions)) {
      sendError(res, 403, "FORBIDDEN", "Missing required permissions for this resource");
      return;
    }
    next();
  };
}

/** Require ALL of the given permissions. */
export function requireAllPermissions(...permissions: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const principal = getPrincipal(req, res);
    if (!principal) return;
    if (!permissions.every((permission) => hasPermission(principal.permissions, permission))) {
      sendError(res, 403, "FORBIDDEN", "Missing required permissions for this resource");
      return;
    }
    next();
  };
}

export { hasPermission, hasAnyPermission };
export type { AuthenticatedPrincipal, AuthenticatedUser, Role };
