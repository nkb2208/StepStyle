import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { authenticate, authorizePermission } from "@ngocanh-auth/auth-express";
import type { AuthenticatedRequest } from "@ngocanh-auth/auth-express";
import { getProducts, toPublicProduct } from "../db";

const router = Router();

const CreateProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(""),
  price: z.number().finite().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
});

const UpdateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).optional(),
    price: z.number().finite().nonnegative().optional(),
    stock: z.number().int().nonnegative().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

function requireUser(req: Request, res: Response): { userId: string; isAdmin: boolean } | null {
  const principal = (req as AuthenticatedRequest).principal;
  if (!principal || principal.type !== "user") {
    res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only user principals may manage products" } });
    return null;
  }
  return { userId: principal.userId, isAdmin: principal.role === "ADMIN" };
}

function pathId(req: Request): string {
  const value = req.params.id;
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Ownership rule: sellers may only touch their own products; ADMIN passes via RBAC. */
async function findOwnedProduct(id: string, user: { userId: string; isAdmin: boolean }) {
  const doc = await getProducts().findOne({ id });
  if (!doc) return null;
  if (!user.isAdmin && doc.ownerId !== user.userId) return "forbidden" as const;
  return doc;
}

router.get("/", authenticate(), authorizePermission("product:read"), async (_req, res, next) => {
  try {
    const docs = await getProducts().find({}).sort({ createdAt: -1 }).limit(100).toArray();
    res.json({ success: true, data: { products: docs.map(toPublicProduct) } });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authenticate(), authorizePermission("product:read"), async (req, res, next) => {
  try {
    const doc = await getProducts().findOne({ id: pathId(req) });
    if (!doc) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } });
      return;
    }
    res.json({ success: true, data: { product: toPublicProduct(doc) } });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate(), authorizePermission("product:create"), async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const input = CreateProductSchema.parse(req.body);
    const now = new Date();
    const product = {
      id: `prd_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      ...input,
      ownerId: user.userId,
      createdAt: now,
      updatedAt: now,
    };
    await getProducts().insertOne(product);
    res.status(201).json({ success: true, data: { product: toPublicProduct(product) } });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", authenticate(), authorizePermission("product:update"), async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const input = UpdateProductSchema.parse(req.body);
    const existing = await findOwnedProduct(pathId(req), user);
    if (existing === null) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } });
      return;
    }
    if (existing === "forbidden") {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "You do not own this product" } });
      return;
    }
    await getProducts().updateOne({ id: existing.id }, { $set: { ...input, updatedAt: new Date() } });
    const updated = await getProducts().findOne({ id: existing.id });
    res.json({ success: true, data: { product: updated ? toPublicProduct(updated) : null } });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authenticate(), authorizePermission("product:delete"), async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const existing = await findOwnedProduct(pathId(req), user);
    if (existing === null) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } });
      return;
    }
    if (existing === "forbidden") {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "You do not own this product" } });
      return;
    }
    await getProducts().deleteOne({ id: existing.id });
    res.json({ success: true, data: { message: "Product deleted" } });
  } catch (error) {
    next(error);
  }
});

export default router;
