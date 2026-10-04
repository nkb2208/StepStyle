import { resolve } from "node:path";

function parseDuration(value: string, fallback: number): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return fallback;
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return amount * multiplier;
}

const nodeEnv = process.env.NODE_ENV ?? "development";

export const config = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  isTest: nodeEnv === "test",
  port: Number(process.env.PORT ?? 4000),
  logLevel: process.env.LOG_LEVEL ?? "info",
  trustProxy: process.env.TRUST_PROXY === "true",

  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/auth-db",

  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "",
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
  appUrl: process.env.FRONTEND_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:4000",

  jwtIssuer: process.env.JWT_ISSUER ?? "auth.yourdomain.com",
  jwtAudience: process.env.JWT_AUDIENCE ?? "api.yourdomain.com",
  jwtPrivateKeyPath: resolve(process.env.JWT_PRIVATE_KEY_PATH ?? "./config/private.key"),
  jwtPublicKeyPath: resolve(process.env.JWT_PUBLIC_KEY_PATH ?? "./config/public.key"),
  jwtPrivateKeyPem: process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  jwtPublicKeyPem: process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, "\n"),
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d",
  accessTokenTtlSeconds: parseDuration(process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m", 900),
  refreshTokenTtlSeconds: parseDuration(process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d", 604800),
  jwksUrl: process.env.JWKS_URL ?? "http://localhost:4000/.well-known/jwks.json",

  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:4000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== "false",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 100),

  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPassword: process.env.SMTP_PASSWORD ?? "",
  mailFrom: process.env.MAIL_FROM ?? "Auth System <noreply@auth.example.com>",

  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL ?? "",
  bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "",
} as const;

export function assertRuntimeConfig(): void {
  const problems: string[] = [];
  if (config.betterAuthSecret.length < 32) {
    problems.push("BETTER_AUTH_SECRET must be at least 32 characters");
  }
  if (config.isProduction) {
    if (!config.jwtPrivateKeyPem && !config.jwtPrivateKeyPath) {
      problems.push("JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_PATH is required in production");
    }
    if (!config.jwtPublicKeyPem && !config.jwtPublicKeyPath) {
      problems.push("JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH is required in production");
    }
    if (config.corsOrigins.some((origin) => origin.includes("localhost"))) {
      problems.push("CORS_ORIGINS must not contain localhost in production");
    }
  }
  if (problems.length > 0) {
    throw new Error(`Invalid configuration:\n- ${problems.join("\n- ")}`);
  }
}
