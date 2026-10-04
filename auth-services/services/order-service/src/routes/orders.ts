import { Router } from "express";
import type { Request } from "express";
import { z } from "zod";
import { authenticate, authorizePermission } from "@ngocanh-auth/auth-express";
import type { AuthenticatedRequest } from "@ngocanh-auth/auth-express";
import { getOrders, toPublicOrder } from "../db";

const router = Router();

const CreateOrderSchema = z.object({
  productId: z.string().min(1).max(100),
  quantity: z.number().int().positive().max(1000),
  /** Used only when PRODUCT_SERVICE_URL is not configured (local demo mode). */
  unitPrice: z.number().finite().nonnegative().optional(),
  productName: z.string().trim().min(1).max(120).optional(),
});

const UpdateOrderSchema = z.object({
  status: z.enum(["pending", "paid", "shipped", "cancelled"]),
});

interface ProductSnapshot {
  id: string;
  name: string;
  price: number;
}

let m2mToken: { token: string; expiresAt: number } | null = null;

/**
 * M2M (service-to-service) call: exchange the configured client credentials
 * for a token via the Auth Service's client_credentials grant, then call the
 * Product service. Returns null when PRODUCT_SERVICE_URL is not configured.
 */
async function fetchProduct(productId: string): Promise<ProductSnapshot | null> {
  const baseUrl = process.env.PRODUCT_SERVICE_URL;
  if (!baseUrl) return null;

  const token = await getM2MToken();
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/products/${encodeURIComponent(productId)}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: { product?: ProductSnapshot } };
  return body.data?.product ?? null;
}

async function getM2MToken(): Promise<string | null> {
  const authUrl = process.env.AUTH_SERVICE_URL;
  const clientId = process.env.PRODUCT_SERVICE_CLIENT_ID;
  const clientSecret = process.env.PRODUCT_SERVICE_CLIENT_SECRET;
  if (!authUrl || !clientId || !clientSecret) return null;

  if (m2mToken && m2mToken.expiresAt > Date.now() + 10_000) return m2mToken.token;

  const response = await fetch(`${authUrl.replace(/\/$/, "")}/api/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: { accessToken?: string; expiresIn?: number } };
  if (!body.data?.accessToken) return null;
  m2mToken = {
    token: body.data.accessToken,
    expiresAt: Date.now() + (body.data.expiresIn ?? 900) * 1000,
  };
  return m2mToken.token;
}

function principalOf(req: Request): { type: "user" | "service"; userId: string; isAdmin: boolean } | null {
  const principal = (req as AuthenticatedRequest).principal;
  if (!principal) return null;
  if (principal.type === "service") {
    return { type: "service", userId: principal.clientId, isAdmin: false };
  }
  return { type: "user", userId: principal.userId, isAdmin: principal.role === "ADMIN" };
}

function pathId(req: Request): string {
  const value = req.params.id;
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

router.post("/", authenticate(), authorizePermission("order:create"), async (req, res, next) => {
  try {
    const principal = principalOf(req);
    if (!principal || principal.type !== "user") {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only user principals can place orders" } });
      return;
    }
    const input = CreateOrderSchema.parse(req.body);

    const product = await fetchProduct(input.productId);
    let productName: string;
    let unitPrice: number;

    if (product) {
      productName = product.name;
      unitPrice = product.price;
    } else if (process.env.PRODUCT_SERVICE_URL) {
      res.status(400).json({ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "Product could not be resolved from the Product service" } });
      return;
    } else if (input.unitPrice !== undefined && input.productName !== undefined) {
      productName = input.productName;
      unitPrice = input.unitPrice;
    } else {
      res.status(400).json({ success: false, error: { code: "PRODUCT_UNAVAILABLE", message: "unitPrice and productName are required when the Product service is not configured" } });
      return;
    }

    const now = new Date();
    const order = {
      id: `ord_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      ownerId: principal.userId,
      productId: input.productId,
      productName,
      quantity: input.quantity,
      unitPrice,
      total: Number((unitPrice * input.quantity).toFixed(2)),
      status: "pending" as const,
      createdAt: now,
      updatedAt: now,
    };
    await getOrders().insertOne(order);
    res.status(201).json({ success: true, data: { order: toPublicOrder(order) } });
  } catch (error) {
    next(error);
  }
});

router.get("/", authenticate(), authorizePermission("order:read"), async (req, res, next) => {
  try {
    const principal = principalOf(req);
    if (!principal) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }
    const filter = principal.isAdmin ? {} : { ownerId: principal.userId };
    const docs = await getOrders().find(filter).sort({ createdAt: -1 }).limit(100).toArray();
    res.json({ success: true, data: { orders: docs.map(toPublicOrder) } });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authenticate(), authorizePermission("order:read"), async (req, res, next) => {
  try {
    const principal = principalOf(req);
    if (!principal) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }
    const doc = await getOrders().findOne({ id: pathId(req) });
    if (!doc || (!principal.isAdmin && doc.ownerId !== principal.userId)) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Order not found" } });
      return;
    }
    res.json({ success: true, data: { order: toPublicOrder(doc) } });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", authenticate(), authorizePermission("order:update"), async (req, res, next) => {
  try {
    const input = UpdateOrderSchema.parse(req.body);
    const doc = await getOrders().findOne({ id: pathId(req) });
    if (!doc) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Order not found" } });
      return;
    }
    await getOrders().updateOne({ id: doc.id }, { $set: { status: input.status, updatedAt: new Date() } });
    const updated = await getOrders().findOne({ id: doc.id });
    res.json({ success: true, data: { order: updated ? toPublicOrder(updated) : null } });
  } catch (error) {
    next(error);
  }
});

export default router;
