import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { MongoError } from "mongodb";
import { config } from "../config";
import { logger } from "../infrastructure/logger";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }

  static badRequest(message: string, code = "BAD_REQUEST"): AppError {
    return new AppError(message, 400, code);
  }

  static unauthorized(message: string, code = "UNAUTHORIZED"): AppError {
    return new AppError(message, 401, code);
  }

  static forbidden(message = "Insufficient permissions", code = "FORBIDDEN"): AppError {
    return new AppError(message, 403, code);
  }

  static notFound(message = "Resource not found", code = "NOT_FOUND"): AppError {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code = "CONFLICT"): AppError {
    return new AppError(message, 409, code);
  }
}

interface BetterAuthApiError {
  statusCode?: number;
  status?: string | number;
  body?: { message?: string; code?: string };
}

function isBetterAuthApiError(error: unknown): error is BetterAuthApiError {
  return typeof error === "object" && error !== null && "statusCode" in error && "body" in error;
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const field = issue?.path.join(".") || "request";
    return AppError.badRequest(`Validation error on field '${field}': ${issue?.message ?? "invalid input"}`, "VALIDATION_ERROR");
  }

  if (error instanceof MongoError && error.code === 11000) {
    return AppError.conflict("A record with the same unique value already exists", "DUPLICATE_KEY");
  }

  if (isBetterAuthApiError(error)) {
    const message = error.body?.message ?? "Authentication request failed";
    const code = error.body?.code ?? "AUTH_ERROR";
    const status = typeof error.statusCode === "number" ? error.statusCode : 400;
    return new AppError(message, status, code);
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500, "INTERNAL_SERVER_ERROR");
  }

  return new AppError("Something went wrong", 500, "INTERNAL_SERVER_ERROR");
}

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const appError = toAppError(error);

  if (appError.statusCode >= 500) {
    logger.error("Unhandled server error", {
      code: appError.code,
      message: appError.message,
      stack: config.isProduction ? undefined : appError.stack,
    });
  }

  const exposeMessage = appError.statusCode < 500 || !config.isProduction;

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: exposeMessage ? appError.message : "Internal server error",
    },
  });
};
