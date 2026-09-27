import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { createHash, createPublicKey, generateKeyPairSync, randomUUID } from "node:crypto";
import { sign as jwtSign, verify as jwtVerify, type JwtPayload } from "jsonwebtoken";
import { config } from "../../config";
import { logger } from "../logger";

export interface AccessTokenClaims extends JwtPayload {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
  type: "user" | "service";
  role?: "ADMIN" | "SELLER" | "CUSTOMER";
  permissions: string[];
  emailVerified?: boolean;
  client_id?: string;
}

export interface PublicJWK {
  kty: string;
  kid: string;
  use: "sig";
  alg: "RS256";
  n: string;
  e: string;
}

interface KeyMaterial {
  privateKey: string;
  publicKey: string;
  kid: string;
}

let cachedKeys: KeyMaterial | null = null;

function unescapePem(value: string): string {
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

function readPemFile(filePath: string): string | null {
  const absolute = isAbsolute(filePath) ? filePath : resolve(filePath);
  if (!existsSync(absolute)) return null;
  return readFileSync(absolute, "utf8");
}

function computeKid(publicKeyPem: string): string {
  const der = createPublicKey(publicKeyPem).export({ type: "spki", format: "der" });
  return createHash("sha256").update(der).digest("base64url").slice(0, 16);
}

function generateAndPersistKeys(): KeyMaterial {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const privatePath = isAbsolute(config.jwtPrivateKeyPath) ? config.jwtPrivateKeyPath : resolve(config.jwtPrivateKeyPath);
  const publicPath = isAbsolute(config.jwtPublicKeyPath) ? config.jwtPublicKeyPath : resolve(config.jwtPublicKeyPath);
  mkdirSync(dirname(privatePath), { recursive: true });
  mkdirSync(dirname(publicPath), { recursive: true });
  writeFileSync(privatePath, privateKey, { mode: 0o600 });
  writeFileSync(publicPath, publicKey, { mode: 0o644 });

  logger.info("Generated new RSA key pair for JWT signing", { privatePath, publicPath });
  return { privateKey, publicKey, kid: computeKid(publicKey) };
}

export function loadKeys(): KeyMaterial {
  if (cachedKeys) return cachedKeys;

  const privateKey = config.jwtPrivateKeyPem
    ? unescapePem(config.jwtPrivateKeyPem)
    : readPemFile(config.jwtPrivateKeyPath);
  const publicKey = config.jwtPublicKeyPem ? unescapePem(config.jwtPublicKeyPem) : readPemFile(config.jwtPublicKeyPath);

  if (privateKey && publicKey) {
    cachedKeys = { privateKey, publicKey, kid: computeKid(publicKey) };
  } else {
    cachedKeys = generateAndPersistKeys();
  }
  return cachedKeys;
}

export function getPublicKeyPem(): string {
  return loadKeys().publicKey;
}

export function getPublicKeyJWKS(): { keys: PublicJWK[] } {
  const { publicKey, kid } = loadKeys();
  const jwk = createPublicKey(publicKey).export({ format: "jwk" }) as { kty: string; n: string; e: string };
  return {
    keys: [{ kty: jwk.kty, n: jwk.n, e: jwk.e, kid, use: "sig", alg: "RS256" }],
  };
}

export interface SignAccessTokenInput {
  sub: string;
  type: "user" | "service";
  role?: "ADMIN" | "SELLER" | "CUSTOMER";
  permissions: string[];
  emailVerified?: boolean;
  clientId?: string;
  expiresInSeconds?: number;
}

export function signAccessToken(input: SignAccessTokenInput): string {
  const { privateKey, kid } = loadKeys();
  const jti = randomUUID();

  const payload: Record<string, unknown> = {
    sub: input.sub,
    jti,
    type: input.type,
    permissions: input.permissions,
  };
  if (input.type === "user") {
    payload.role = input.role;
    payload.emailVerified = input.emailVerified ?? false;
  }
  if (input.clientId) payload.client_id = input.clientId;

  return jwtSign(payload, privateKey, {
    algorithm: "RS256",
    keyid: kid,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    expiresIn: input.expiresInSeconds ?? config.accessTokenTtlSeconds,
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const { publicKey } = loadKeys();
  const decoded = jwtVerify(token, publicKey, {
    algorithms: ["RS256"],
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    clockTolerance: 5,
  });
  if (typeof decoded === "string") throw new Error("Token payload must be an object");
  return decoded as AccessTokenClaims;
}
