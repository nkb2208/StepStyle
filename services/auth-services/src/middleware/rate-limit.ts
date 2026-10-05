import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config";

function buildMessage(code: string, message: string) {
  return { success: false, error: { code, message } };
}

/** Skips the limiter entirely when RATE_LIMIT_ENABLED=false (used by automated tests). */
function maybe(limiter: RequestHandler): RequestHandler {
  return (req, res, next) => {
    if (process.env.RATE_LIMIT_ENABLED === "false") {
      next();
      return;
    }
    limiter(req, res, next);
  };
}

/** Global limiter for all /api routes. */
export const apiLimiter = maybe(
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: buildMessage("TOO_MANY_REQUESTS", "Too many requests, please try again later."),
  })
);

/** Brute-force protection for credential endpoints (register / login). */
export const authLimiter = maybe(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: buildMessage("TOO_MANY_REQUESTS", "Too many authentication attempts, please try again later."),
  })
);

/** Limits password-reset requests to prevent email bombing. */
export const forgotPasswordLimiter = maybe(
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: buildMessage("TOO_MANY_REQUESTS", "Too many password reset requests, please try again later."),
  })
);

/** Limits refresh-token exchanges to slow down stolen-token replay. */
export const refreshLimiter = maybe(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: buildMessage("TOO_MANY_REQUESTS", "Too many token refresh attempts, please try again later."),
  })
);
