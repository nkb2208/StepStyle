export type Role = "ADMIN" | "SELLER" | "CUSTOMER";

export type Permission = string;

export interface JwtPayload {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
  type: "user" | "service";
  role?: Role;
  permissions: Permission[];
  emailVerified?: boolean;
  client_id?: string;
}

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
  | (AuthenticatedUser & { type: "user" })
  | (AuthenticatedService & { type: "service" });

export interface VerifierOptions {
  jwksUrl?: string;
  publicKeyPem?: string;
  issuer: string;
  audience: string;
  clockToleranceSeconds?: number;
}
