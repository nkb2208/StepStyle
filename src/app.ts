import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config";
import { getPublicKeyJWKS } from "./infrastructure/jwt";
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

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "auth-service",
      version: "1.0.0",
    });
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
