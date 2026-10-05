import type { NextFunction, Request, Response } from "express";
import { config } from "../../config";
import { AppError } from "../../middleware/error-handler";
import type { AuthenticatedRequest } from "../../middleware/authenticate";
import { loginUser, logoutUser, refreshSession, registerUser } from "../users/user.service";
import {
  changePassword,
  getProfile,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from "./auth.service";
import { clientCredentialsGrant } from "./service-token.service";
import {
  ChangePasswordSchema,
  ClientCredentialsSchema,
  ForgotPasswordSchema,
  LoginSchema,
  LogoutSchema,
  RefreshSchema,
  RegisterSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from "./auth.schema";

function requireUser(req: AuthenticatedRequest): { userId: string; jti: string; type: "user" | "service"; clientId: string } {
  const principal = req.principal;
  if (!principal) throw AppError.unauthorized("Authentication required", "MISSING_TOKEN");
  return {
    userId: principal.type === "user" ? principal.userId : principal.clientId,
    jti: principal.jti,
    type: principal.type,
    clientId: principal.type === "service" ? principal.clientId : "",
  };
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = RegisterSchema.parse(req.body);
      const { profile, accessToken, refreshToken } = await registerUser(input);
      res.status(201).json({
        success: true,
        data: {
          user: profile,
          accessToken,
          refreshToken,
          tokenType: "Bearer",
          expiresIn: config.accessTokenTtlSeconds,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = LoginSchema.parse(req.body);
      const { profile, accessToken, refreshToken } = await loginUser(input);
      res.json({
        success: true,
        data: {
          user: profile,
          accessToken,
          refreshToken,
          tokenType: "Bearer",
          expiresIn: config.accessTokenTtlSeconds,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = LogoutSchema.parse(req.body ?? {});
      const principal = requireUser(req as AuthenticatedRequest);
      await logoutUser({
        jti: principal.jti,
        subjectId: principal.userId,
        ttlSeconds: config.accessTokenTtlSeconds,
        refreshToken: input.refreshToken,
      });
      res.json({ success: true, data: { message: "Logged out successfully" } });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = RefreshSchema.parse(req.body);
      const { accessToken, refreshToken } = await refreshSession(input.refreshToken);
      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          tokenType: "Bearer",
          expiresIn: config.accessTokenTtlSeconds,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const principal = requireUser(req as AuthenticatedRequest);
      if (principal.type !== "user") {
        throw AppError.forbidden("Only user principals can access this resource", "FORBIDDEN");
      }
      const user = await getProfile(principal.userId);
      res.json({ success: true, data: { user } });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = ForgotPasswordSchema.parse(req.body);
      const { message } = await requestPasswordReset(input);
      res.json({ success: true, data: { message } });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = ResetPasswordSchema.parse(req.body);
      const { message } = await resetPassword(input);
      res.json({ success: true, data: { message } });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = ChangePasswordSchema.parse(req.body);
      const principal = requireUser(req as AuthenticatedRequest);
      if (principal.type !== "user") {
        throw AppError.forbidden("Only user principals can access this resource", "FORBIDDEN");
      }
      const { message } = await changePassword(principal.userId, input);
      res.json({ success: true, data: { message } });
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = VerifyEmailSchema.parse(req.body);
      const { message } = await verifyEmail(input);
      res.json({ success: true, data: { message } });
    } catch (error) {
      next(error);
    }
  }

  static async clientCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = ClientCredentialsSchema.parse(req.body);
      const result = await clientCredentialsGrant(input);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
