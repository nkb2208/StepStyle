import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.LOG_LEVEL = "error";
process.env.MAIL_TRANSPORT = "memory";
process.env.BETTER_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
process.env.JWT_ISSUER = "auth.test.local";
process.env.JWT_AUDIENCE = "api.test.local";
process.env.FRONTEND_URL = "http://localhost:4000";
process.env.BETTER_AUTH_URL = "http://localhost:4000";
process.env.CORS_ORIGINS = "http://localhost:3000";

if (!process.env.JWT_PRIVATE_KEY_PATH || !process.env.JWT_PUBLIC_KEY_PATH) {
  const keyDir = mkdtempSync(join(tmpdir(), "ngocanh-auth-test-keys-"));
  process.env.JWT_PRIVATE_KEY_PATH = join(keyDir, "private.key");
  process.env.JWT_PUBLIC_KEY_PATH = join(keyDir, "public.key");
}
