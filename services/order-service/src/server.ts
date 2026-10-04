import "dotenv/config";
import { configureAuth } from "@ngocanh-auth/auth-express";
import { createOrderApp } from "./app";
import { connectOrderDb } from "./db";

async function start(): Promise<void> {
  try {
    await connectOrderDb();

    await configureAuth({
      jwksUrl: process.env.JWKS_URL ?? "http://localhost:4000/.well-known/jwks.json",
      issuer: process.env.JWT_ISSUER ?? "auth.yourdomain.com",
      audience: process.env.JWT_AUDIENCE ?? "api.yourdomain.com",
      clockToleranceSeconds: 5,
    });

    const port = Number(process.env.PORT ?? 4003);
    createOrderApp().listen(port, () => {
      console.log(`[order-service] listening on port ${port}`);
    });
  } catch (error) {
    console.error("[order-service] failed to start:", error);
    process.exit(1);
  }
}

void start();
