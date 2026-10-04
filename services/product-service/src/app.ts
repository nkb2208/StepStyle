import cors from "cors";
import express from "express";
import helmet from "helmet";
import productRoutes from "./routes/products";

export function createProductApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (process.env.CORS_ORIGINS ?? "*").split(",").map((origin) => origin.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "product-service", timestamp: new Date().toISOString() });
  });

  app.use("/api/products", productRoutes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (error instanceof Error && "name" in error && error.name === "ZodError") {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: error.message } });
        return;
      }
      const message = error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message } });
    }
  );

  return app;
}
