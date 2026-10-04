import { hashPassword, verifyPassword } from "better-auth/crypto";
import { ObjectId } from "mongodb";
import { config } from "../../config";
import { getAuthInstance } from "../../lib/auth";
import { getDB, revokeAllUserRefreshTokens } from "../../infrastructure/database";
import { sendPasswordChangedEmail } from "../../infrastructure/email";
import { publishAuthEvent } from "../../infrastructure/events";
import { AppError } from "../../middleware/error-handler";
import { logger } from "../../infrastructure/logger";
import { getUserProfile, type UserProfile } from "../users/user.service";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.schema";

const GENERIC_RESET_MESSAGE =
  "If an account exists for this email, password reset instructions have been sent.";

/** Better Auth's MongoDB adapter stores account.userId as ObjectId. */
function toMongoId(value: string): string | ObjectId {
  return ObjectId.isValid(value) ? new ObjectId(value) : value;
}

function betterAuthErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "body" in error) {
    return (error as { body?: { code?: string } }).body?.code;
  }
  return undefined;
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<{ message: string }> {
  const email = input.email.toLowerCase();
  try {
    await getAuthInstance().api.requestPasswordReset({
      body: { email, redirectTo: `${config.appUrl}/reset-password` },
    });
  } catch (error) {
    logger.warn("Password reset request failed", {
      email,
      code: betterAuthErrorCode(error),
      error: error instanceof Error ? error.message : "unknown",
    });
  }
  return { message: GENERIC_RESET_MESSAGE };
}

export async function resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
  const db = getDB();

  const verification = await db.collection("verification").findOne({ identifier: `reset-password:${input.token}` });

  await getAuthInstance().api.resetPassword({
    body: { newPassword: input.password, token: input.token },
  });

  const userId = typeof verification?.value === "string" ? verification.value : null;
  if (userId) {
    await db
      .collection("verification")
      .deleteMany({ identifier: { $regex: "^reset-password:" }, value: userId });
    await revokeAllUserRefreshTokens(userId);

    publishAuthEvent("user.password.changed", { userId, reason: "reset" });

    const email = await findUserEmail(userId);
    if (email) {
      try {
        await sendPasswordChangedEmail(email);
      } catch (error) {
        logger.warn("Failed to send password-changed notification", {
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }

  return { message: "Password has been reset successfully" };
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput
): Promise<{ message: string }> {
  if (input.currentPassword === input.newPassword) {
    throw AppError.badRequest("New password must be different from the current password", "SAME_PASSWORD");
  }

  const db = getDB();
  const account = await db.collection("account").findOne({ userId: toMongoId(userId), providerId: "credential" });
  if (!account?.password) {
    throw AppError.notFound("No credential account found", "ACCOUNT_NOT_FOUND");
  }

  const valid = await verifyPassword({ password: input.currentPassword, hash: account.password });
  if (!valid) {
    throw AppError.unauthorized("Current password is incorrect", "INVALID_CREDENTIALS");
  }

  const newHash = await hashPassword(input.newPassword);
  await db.collection("account").updateOne({ _id: account._id }, { $set: { password: newHash } });

  await revokeAllUserRefreshTokens(userId);
  publishAuthEvent("user.password.changed", { userId, reason: "change" });

  const email = await findUserEmail(userId);
  if (email) {
    try {
      await sendPasswordChangedEmail(email);
    } catch (error) {
      logger.warn("Failed to send password-changed notification", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return { message: "Password changed successfully" };
}

export async function verifyEmail(input: VerifyEmailInput): Promise<{ message: string }> {
  let email: string | undefined;
  try {
    const payloadSegment = input.token.split(".")[1];
    if (payloadSegment) {
      const payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8")) as { email?: string };
      email = payload.email;
    }
  } catch {
    email = undefined;
  }

  await getAuthInstance().api.verifyEmail({ query: { token: input.token } });

  if (email) {
    const user = await getDB().collection("user").findOne({ email: email.toLowerCase() });
    if (user) {
      publishAuthEvent("user.updated", {
        userId: String(user._id),
        email: email.toLowerCase(),
        emailVerified: true,
      });
    }
  }

  return { message: "Email verified successfully" };
}

export async function getProfile(userId: string): Promise<UserProfile> {
  return getUserProfile(userId);
}

async function findUserEmail(userId: string): Promise<string | null> {
  try {
    const profile = await getUserProfile(userId);
    return profile.email || null;
  } catch {
    return null;
  }
}
