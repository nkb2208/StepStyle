import { z } from "zod";

const email = z.string().trim().email().max(254);
const password = z.string().min(8).max(128);

export const RegisterSchema = z.object({
  email,
  password,
  name: z.string().trim().min(2).max(50),
  role: z.enum(["CUSTOMER", "SELLER"]).default("CUSTOMER"),
});

export const LoginSchema = z.object({
  email,
  password,
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1).max(512).optional(),
});

export const ForgotPasswordSchema = z.object({
  email,
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1).max(512),
  password,
});

export const ChangePasswordSchema = z.object({
  currentPassword: password,
  newPassword: password,
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1).max(4096),
});

export const ClientCredentialsSchema = z.object({
  grant_type: z.literal("client_credentials"),
  client_id: z.string().min(1).max(100),
  client_secret: z.string().min(1).max(512),
  scope: z.string().max(1000).optional(),
});

const scopePattern = /^[a-z][a-z0-9_-]*:(\*|[a-z][a-z0-9_-]*)$/;

export const CreateServiceClientSchema = z.object({
  name: z.string().trim().min(1).max(100),
  scopes: z.array(z.string().regex(scopePattern, "Scopes must use the <resource>:<action> format")).min(1).max(50),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
export type LogoutInput = z.infer<typeof LogoutSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type ClientCredentialsInput = z.infer<typeof ClientCredentialsSchema>;
export type CreateServiceClientInput = z.infer<typeof CreateServiceClientSchema>;
