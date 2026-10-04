import { createPublicKey, type JsonWebKey } from "node:crypto";
import { verify as verifyJwt, TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import type { JwtPayload, VerifierOptions } from "./types";

const JWKS_REFRESH_INTERVAL_MS = 60_000;

interface JwksDocument {
  keys: Array<JsonWebKey & { kid?: string; use?: string; alg?: string }>;
}

export class TokenVerificationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TokenVerificationError";
    this.code = code;
  }
}

/**
 * Stateless JWT verifier backed by a JWKS endpoint (or a static public key).
 *
 * Downstream microservices use this to verify access tokens at their own
 * security boundary without calling the Authentication Service on every
 * request — only the public key material is fetched (and cached).
 */
export class JwksVerifier {
  private readonly options: Required<Pick<VerifierOptions, "clockToleranceSeconds">> & VerifierOptions;
  private readonly keysByKid = new Map<string, string>();
  private lastFetchAt = 0;
  private inflight: Promise<void> | null = null;

  constructor(options: VerifierOptions) {
    if (!options.jwksUrl && !options.publicKeyPem) {
      throw new Error("Either jwksUrl or publicKeyPem must be provided");
    }
    this.options = { clockToleranceSeconds: 5, ...options };
    if (options.publicKeyPem && !options.jwksUrl) {
      this.keysByKid.set("*", options.publicKeyPem);
    }
  }

  /** Pre-fetch the JWKS at startup so the first request fails fast on misconfiguration. */
  async init(): Promise<void> {
    if (this.options.jwksUrl) await this.fetchJwks(true);
  }

  private async fetchJwks(force = false): Promise<void> {
    if (!this.options.jwksUrl) return;
    const now = Date.now();
    if (!force && now - this.lastFetchAt < JWKS_REFRESH_INTERVAL_MS) return;
    if (this.inflight) return this.inflight;

    this.inflight = (async () => {
      try {
        const response = await fetch(this.options.jwksUrl!, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error(`JWKS endpoint returned ${response.status}`);
        const document = (await response.json()) as JwksDocument;
        if (!Array.isArray(document.keys) || document.keys.length === 0) {
          throw new Error("JWKS document contains no keys");
        }
        for (const jwk of document.keys) {
          if (!jwk.kid) continue;
          this.keysByKid.set(jwk.kid, jwkToPem(jwk));
        }
        this.lastFetchAt = Date.now();
      } catch (error) {
        throw new TokenVerificationError(
          "JWKS_UNAVAILABLE",
          `Unable to fetch JWKS from ${this.options.jwksUrl}: ${error instanceof Error ? error.message : "unknown error"}`
        );
      } finally {
        this.inflight = null;
      }
    })();

    return this.inflight;
  }

  private async resolveKey(kid: string | undefined): Promise<string> {
    if (this.keysByKid.has("*")) return this.keysByKid.get("*")!;

    const known = kid ? this.keysByKid.get(kid) : undefined;
    if (known) return known;

    await this.fetchJwks();
    const refreshed = kid ? this.keysByKid.get(kid) : [...this.keysByKid.values()][0];
    if (!refreshed) {
      throw new TokenVerificationError("UNKNOWN_KEY", `No JWKS key found for kid "${kid ?? "none"}"`);
    }
    return refreshed;
  }

  async verify(token: string): Promise<JwtPayload> {
    if (typeof token !== "string" || token.split(".").length !== 3) {
      throw new TokenVerificationError("INVALID_TOKEN", "Malformed JWT");
    }

    let header: { alg?: string; kid?: string };
    try {
      header = JSON.parse(Buffer.from(token.split(".")[0]!, "base64url").toString("utf8"));
    } catch {
      throw new TokenVerificationError("INVALID_TOKEN", "Malformed JWT header");
    }

    if (header.alg !== "RS256") {
      throw new TokenVerificationError("INVALID_ALGORITHM", "Token must be signed with RS256");
    }

    const publicKey = await this.resolveKey(header.kid);

    try {
      const payload = verifyJwt(token, publicKey, {
        algorithms: ["RS256"],
        issuer: this.options.issuer,
        audience: this.options.audience,
        clockTolerance: this.options.clockToleranceSeconds,
      });
      if (typeof payload === "string") {
        throw new TokenVerificationError("INVALID_TOKEN", "Token payload must be an object");
      }
      return payload as JwtPayload;
    } catch (error) {
      if (error instanceof TokenVerificationError) throw error;
      if (error instanceof TokenExpiredError) {
        throw new TokenVerificationError("TOKEN_EXPIRED", "The provided JWT access token has expired");
      }
      if (error instanceof JsonWebTokenError) {
        throw new TokenVerificationError("INVALID_TOKEN", "The provided JWT access token is invalid");
      }
      throw new TokenVerificationError("INVALID_TOKEN", "The provided JWT access token is invalid");
    }
  }
}

export function jwkToPem(jwk: JsonWebKey & { kid?: string; use?: string; alg?: string }): string {
  return createPublicKey({ key: jwk as JsonWebKey, format: "jwk" }).export({ type: "spki", format: "pem" }).toString();
}

export async function createVerifier(options: VerifierOptions): Promise<JwksVerifier> {
  const verifier = new JwksVerifier(options);
  await verifier.init();
  return verifier;
}
