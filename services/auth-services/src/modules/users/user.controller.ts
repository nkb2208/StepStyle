import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../middleware/error-handler";
import type { AuthenticatedRequest } from "../../middleware/authenticate";
import type { Role } from "../authorization/roles";
import { createUserByAdmin, deleteUserByAdmin, listUsers, updateUserByAdmin } from "./user.service";

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const CreateUserSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(50),
  role: z.enum(["ADMIN", "SELLER", "CUSTOMER"]).default("CUSTOMER"),
});

const UpdateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(50).optional(),
    role: z.enum(["ADMIN", "SELLER", "CUSTOMER"]).optional(),
    emailVerified: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

function requireActor(req: AuthenticatedRequest): string {
  const principal = req.principal;
  if (!principal) throw AppError.unauthorized("Authentication required", "MISSING_TOKEN");
  if (principal.type !== "user") {
    throw AppError.forbidden("Only user principals can manage users", "FORBIDDEN");
  }
  return principal.userId;
}

function pathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export class UserController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ListQuerySchema.parse(req.query);
      const result = await listUsers(query.page, query.limit);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateUserSchema.parse(req.body);
      const user = await createUserByAdmin({ ...input, role: input.role as Role });
      res.status(201).json({ success: true, data: { user } });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patch = UpdateUserSchema.parse(req.body);
      const user = await updateUserByAdmin(pathParam(req, "id"), patch as { name?: string; role?: Role; emailVerified?: boolean });
      res.json({ success: true, data: { user } });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = requireActor(req as AuthenticatedRequest);
      await deleteUserByAdmin(pathParam(req, "id"), actorId);
      res.json({ success: true, data: { message: "User deleted successfully" } });
    } catch (error) {
      next(error);
    }
  }
}
