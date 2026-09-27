import { config } from "../../config";

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const sensitiveKeys = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "passwordhash",
  "hash",
  "secret",
  "clientsecret",
  "token",
  "accesstoken",
  "refreshtoken",
  "resettoken",
  "privatekey",
  "authorization",
  "cookie",
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    result[key] = sensitiveKeys.has(key.toLowerCase()) ? "[REDACTED]" : sanitize(entry, depth + 1);
  }
  return result;
}

function write(level: Level, message: string, context?: Record<string, unknown>): void {
  const threshold = LEVELS[(config.logLevel as Level) in LEVELS ? (config.logLevel as Level) : "info"];
  if (LEVELS[level] < threshold) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? (sanitize(context) as Record<string, unknown>) : {}),
  };

  const line = config.isProduction ? JSON.stringify(entry) : `[${level.toUpperCase()}] ${message}${context ? ` ${JSON.stringify(sanitize(context))}` : ""}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};
