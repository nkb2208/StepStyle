import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { config } from "../config";
import { getDB } from "../infrastructure/database";
import { sendPasswordResetEmail, sendVerificationEmail } from "../infrastructure/email";
import { logger } from "../infrastructure/logger";

type AuthInstance = ReturnType<typeof buildAuth>;

function buildAuth() {
  return betterAuth({
    database: mongodbAdapter(getDB()),
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    emailAndPassword: {
      enabled: true,
      resetPasswordTokenExpiresIn: 3600,
      sendResetPassword: async ({ user, token }) => {
        const resetUrl = `${config.appUrl}/reset-password?token=${token}`;
        try {
          await sendPasswordResetEmail(user.email, resetUrl);
        } catch (error) {
          logger.error("Failed to send password reset email", {
            email: user.email,
            error: error instanceof Error ? error.message : "unknown",
          });
        }
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, token }) => {
        const verificationUrl = `${config.appUrl}/verify-email?token=${token}`;
        try {
          await sendVerificationEmail(user.email, verificationUrl);
        } catch (error) {
          logger.error("Failed to send verification email", {
            email: user.email,
            error: error instanceof Error ? error.message : "unknown",
          });
        }
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60,
    },
  });
}

let authInstance: AuthInstance | null = null;

/**
 * Better Auth is the credential authority of this service: password hashing
 * (scrypt via better-auth/crypto), password reset tokens and email
 * verification tokens all come from Better Auth. The HTTP surface of this
 * service is our own Express API — Better Auth's session cookie flow is not
 * exposed because downstream services authenticate with stateless JWTs.
 */
export function getAuthInstance(): AuthInstance {
  if (authInstance) return authInstance;
  authInstance = buildAuth();
  return authInstance;
}

export function resetAuthInstance(): void {
  authInstance = null;
}

export type { AuthInstance };
