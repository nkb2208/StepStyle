import "dotenv/config";
import { assertRuntimeConfig, config } from "./config";
import { createApp } from "./app";
import { connectDB } from "./infrastructure/database";
import { loadKeys } from "./infrastructure/jwt";
import { logger } from "./infrastructure/logger";
import { bootstrapAdmin } from "./modules/users/bootstrap-admin";

async function start(): Promise<void> {
  try {
    assertRuntimeConfig();
    await connectDB();
    loadKeys();

    try {
      await bootstrapAdmin();
    } catch (error) {
      logger.error("Bootstrap admin failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    const app = createApp();
    app.listen(config.port, () => {
      logger.info("Authentication service started", {
        port: config.port,
        nodeEnv: config.nodeEnv,
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      });
    });
  } catch (error) {
    logger.error("Failed to start authentication service", {
      error: error instanceof Error ? error.message : "unknown",
    });
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason: String(reason) });
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error: error.message });
  process.exit(1);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down`);
    process.exit(0);
  });
}

void start();
