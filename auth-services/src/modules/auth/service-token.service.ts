import { hashPassword, verifyPassword } from "better-auth/crypto";
import { config } from "../../config";
import {
  createServiceClient,
  findServiceClient,
  generateOpaqueToken,
  listServiceClients,
  revokeServiceClient,
} from "../../infrastructure/database";
import { signAccessToken } from "../../infrastructure/jwt";
import { logger } from "../../infrastructure/logger";
import { AppError } from "../../middleware/error-handler";
import type { ClientCredentialsInput, CreateServiceClientInput } from "./auth.schema";

export interface ServiceClientSummary {
  clientId: string;
  name: string;
  scopes: string[];
  createdAt: Date;
  revokedAt: Date | null;
}

export interface ClientCredentialsResult {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  scopes: string[];
}

function toSummary(client: {
  clientId: string;
  name: string;
  scopes: string[];
  createdAt: Date;
  revokedAt: Date | null;
}): ServiceClientSummary {
  return {
    clientId: client.clientId,
    name: client.name,
    scopes: client.scopes,
    createdAt: client.createdAt,
    revokedAt: client.revokedAt,
  };
}

/**
 * Service-to-Service (M2M) authentication.
 *
 * Machine callers exchange a client_id / client_secret pair for a short-lived
 * signed JWT (OAuth2-style client_credentials grant). The secret is hashed
 * with Better Auth's password hashing (scrypt) and never stored or logged in
 * plain text. Service tokens carry `type: "service"` so downstream services
 * can differentiate machine callers from user-delegated requests.
 */
export async function registerServiceClient(input: CreateServiceClientInput): Promise<ServiceClientSummary & { clientSecret: string }> {
  const clientSecret = generateOpaqueToken("cs");
  const secretHash = await hashPassword(clientSecret);

  const client = await createServiceClient({
    name: input.name,
    secretHash,
    scopes: input.scopes,
  });

  logger.info("Service client registered", { clientId: client.clientId, scopes: client.scopes });

  return { ...toSummary(client), clientSecret };
}

export async function listRegisteredServiceClients(): Promise<ServiceClientSummary[]> {
  const clients = await listServiceClients();
  return clients.map(toSummary);
}

export async function revokeRegisteredServiceClient(clientId: string): Promise<void> {
  const revoked = await revokeServiceClient(clientId);
  if (!revoked) throw AppError.notFound("Service client not found or already revoked", "SERVICE_CLIENT_NOT_FOUND");
  logger.info("Service client revoked", { clientId });
}

export async function clientCredentialsGrant(input: ClientCredentialsInput): Promise<ClientCredentialsResult> {
  const client = await findServiceClient(input.client_id);
  if (!client || client.revokedAt) {
    throw AppError.unauthorized("Invalid client credentials", "INVALID_CLIENT");
  }

  const valid = await verifyPassword({ password: input.client_secret, hash: client.secretHash });
  if (!valid) {
    throw AppError.unauthorized("Invalid client credentials", "INVALID_CLIENT");
  }

  let scopes = client.scopes;
  if (input.scope) {
    const requested = input.scope.split(/\s+/).filter(Boolean);
    const unauthorized = requested.filter((scope) => !client.scopes.includes(scope));
    if (unauthorized.length > 0) {
      throw AppError.forbidden(`Client is not allowed to request scope: ${unauthorized.join(", ")}`, "INVALID_SCOPE");
    }
    scopes = requested;
  }

  const accessToken = signAccessToken({
    sub: client.clientId,
    type: "service",
    permissions: scopes,
    clientId: client.clientId,
    expiresInSeconds: config.accessTokenTtlSeconds,
  });

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: config.accessTokenTtlSeconds,
    scopes,
  };
}
