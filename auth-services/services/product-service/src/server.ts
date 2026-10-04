import "dotenv/config";
import { configureAuth } from "@ngocanh-auth/auth-express";
import { createProductApp } from "./app";
import { connectProductDb } from "./db";

async function start(): Promise<void> {
  try {
    await connectProductDb();

    await configureAuth({
      jwksUrl: process.env.JWKS_URL ?? "http://localhost:4000/.well-known/jwks.json",
      issuer: process.env.JWT_ISSUER ?? "auth.yourdomain.com",
      audience: process.env.JWT_AUDIENCE ?? "api.yourdomain.com",
      clockToleranceSeconds: 5,
    });

    const port = Number(process.env.PORT ?? 4002);
    createProductApp().listen(port, () => {
      console.log(`[product-service] listening on port ${port}`);
    });
  } catch (error) {
    console.error("[product-service] failed to start:", error);
    process.exit(1);
  }
}

void start();
