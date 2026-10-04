import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate";
import { authorizeRole } from "../authorization/authorization.middleware";
import { CreateServiceClientSchema } from "../auth/auth.schema";
import {
  listRegisteredServiceClients,
  registerServiceClient,
  revokeRegisteredServiceClient,
} from "../auth/service-token.service";

const router = Router();

router.use(authenticate, authorizeRole("ADMIN"));

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await listRegisteredServiceClients();
    res.json({ success: true, data: { clients } });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateServiceClientSchema.parse(req.body);
    const client = await registerServiceClient(input);
    res.status(201).json({
      success: true,
      data: {
        client,
        note: "Store the clientSecret securely — it cannot be retrieved again.",
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:clientId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.params.clientId;
    const clientId = z.string().min(1).parse(Array.isArray(raw) ? raw[0] : raw);
    await revokeRegisteredServiceClient(clientId);
    res.json({ success: true, data: { message: "Service client revoked" } });
  } catch (error) {
    next(error);
  }
});

export default router;
