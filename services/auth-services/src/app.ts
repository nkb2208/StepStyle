import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config";
import { getDB } from "./infrastructure/database";
import { getPublicKeyJWKS } from "./infrastructure/jwt";
import { logger } from "./infrastructure/logger";
import { errorHandler } from "./middleware/error-handler";
import { apiLimiter } from "./middleware/rate-limit";
import authRoutes from "./modules/auth/auth.routes";
import serviceRoutes from "./modules/auth/service.routes";
import userRoutes from "./modules/users/user.routes";

export function createApp() {
  const app = express();

  if (config.trustProxy) app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/", apiLimiter);

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/services", serviceRoutes);

  // ── Discovery ──────────────────────────────────────────────────────────────
  app.get("/", (_req, res) => {
    res.json({
      service: "StepStyle Auth Service",
      version: "1.0.0",
      api_prefix: "/api",
      endpoints: {
        auth: "/api/auth",
        users: "/api/users",
        services: "/api/services",
        jwks: "/.well-known/jwks.json",
      },
    });
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "auth-service",
      version: "1.0.0",
    });
  });

  app.get("/health/ready", async (_req, res) => {
    const checks: Record<string, string> = {};
    let statusCode = 200;
    try {
      await getDB().command({ ping: 1 });
      checks.database = "ok";
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      checks.database = `error: ${message}`;
      statusCode = 503;
      logger.warn("Readiness check failed", { error: message });
    }
    res
      .status(statusCode)
      .json({ status: statusCode === 200 ? "ok" : "degraded", checks });
  });

  app.get("/.well-known/jwks.json", (_req, res) => {
    try {
      res.json(getPublicKeyJWKS());
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: "JWKS_ERROR", message: "Failed to publish JWKS" },
      });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  });

  app.use(errorHandler);

  return app;
}
