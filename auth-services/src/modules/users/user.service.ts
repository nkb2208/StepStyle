import { config } from "../../config";
import { getAuthInstance } from "../../lib/auth";
import {
  findRefreshToken,
  generateFamilyId,
  generateOpaqueToken,
  markRefreshTokenUsed,
  revokeAccessToken,
  revokeAllUserRefreshTokens,
  revokeRefreshTokenFamily,
  storeRefreshToken,
  getDB,
} from "../../infrastructure/database";
import { publishAuthEvent } from "../../infrastructure/events";
import { signAccessToken } from "../../infrastructure/jwt";
import { logger } from "../../infrastructure/logger";
import { AppError } from "../../middleware/error-handler";
import { getPermissionsForRole } from "../authorization/permissions";
import { isRole, type Role } from "../authorization/roles";
import * as userRepository from "./user.repository";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  permissions: string[];
  createdAt: Date;
}

export interface UserListResult {
  users: UserProfile[];
  pagination: { page: number; limit: number; total: number };
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface BetterAuthResult {
  token: string | null;
  user: { id: string; email: string; name?: string; emailVerified?: boolean };
}

async function discardBetterAuthSession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  try {
    await getDB().collection("session").deleteOne({ token });
  } catch (error) {
    logger.warn("Failed to discard Better Auth session", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

function betterAuthErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "body" in error) {
    return (error as { body?: { code?: string } }).body?.code;
  }
  return undefined;
}

async function buildProfile(userId: string): Promise<UserProfile | null> {
  const [extension, authUser] = await Promise.all([
    userRepository.findUserExtension(userId),
    userRepository.findAuthUserById(userId),
  ]);
  if (!extension && !authUser) return null;
  const role = (extension?.role ?? "CUSTOMER") as Role;
  return {
    id: userId,
    email: authUser?.email ?? extension?.email ?? "",
    name: authUser?.name ?? "",
    role,
    emailVerified: authUser?.emailVerified ?? false,
    permissions: getPermissionsForRole(role),
    createdAt: authUser?.createdAt ?? extension?.createdAt ?? new Date(),
  };
}

export async function issueUserTokens(profile: {
  id: string;
  role: Role;
  emailVerified: boolean;
}): Promise<IssuedTokens> {
  const accessToken = signAccessToken({
    sub: profile.id,
    type: "user",
    role: profile.role,
    permissions: getPermissionsForRole(profile.role),
    emailVerified: profile.emailVerified,
    expiresInSeconds: config.accessTokenTtlSeconds,
  });

  const refreshToken = generateOpaqueToken("rt");
  await storeRefreshToken({
    token: refreshToken,
    userId: profile.id,
    familyId: generateFamilyId(),
    ttlSeconds: config.refreshTokenTtlSeconds,
  });

  return { accessToken, refreshToken, expiresIn: config.accessTokenTtlSeconds };
}

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
}): Promise<{ profile: UserProfile } & IssuedTokens> {
  const email = input.email.toLowerCase();
  const auth = getAuthInstance();

  let signup: BetterAuthResult;
  try {
    signup = (await auth.api.signUpEmail({
      body: { email, password: input.password, name: input.name },
    })) as BetterAuthResult;
  } catch (error) {
    if (betterAuthErrorCode(error) === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      throw AppError.conflict("An account with this email already exists", "EMAIL_EXISTS");
    }
    throw error;
  }

  await discardBetterAuthSession(signup.token);
  await userRepository.upsertUserExtension({ userId: signup.user.id, email, role: input.role });

  const profile: UserProfile = {
    id: signup.user.id,
    email,
    name: input.name,
    role: input.role,
    emailVerified: signup.user.emailVerified ?? false,
    permissions: getPermissionsForRole(input.role),
    createdAt: new Date(),
  };

  publishAuthEvent("user.created", {
    userId: profile.id,
    email,
    name: input.name,
    role: input.role,
  });

  const tokens = await issueUserTokens(profile);
  return { profile, ...tokens };
}

export async function loginUser(input: { email: string; password: string }): Promise<{
  profile: UserProfile;
} & IssuedTokens> {
  const email = input.email.toLowerCase();
  const auth = getAuthInstance();

  let result: BetterAuthResult;
  try {
    result = (await auth.api.signInEmail({
      body: { email, password: input.password },
    })) as BetterAuthResult;
  } catch (error) {
    const code = betterAuthErrorCode(error);
    if (code === "INVALID_EMAIL_OR_PASSWORD" || code === "INVALID_EMAIL") {
      throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }
    throw error;
  }

  await discardBetterAuthSession(result.token);

  const extension = await userRepository.ensureUserExtension({
    userId: result.user.id,
    email: result.user.email,
    role: "CUSTOMER",
  });

  const profile: UserProfile = {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name ?? "",
    role: extension.role as Role,
    emailVerified: result.user.emailVerified ?? false,
    permissions: getPermissionsForRole(extension.role as Role),
    createdAt: new Date(),
  };

  const tokens = await issueUserTokens(profile);
  return { profile, ...tokens };
}

export async function refreshSession(refreshToken: string): Promise<IssuedTokens> {
  const doc = await findRefreshToken(refreshToken);
  if (!doc) throw AppError.unauthorized("Invalid refresh token", "INVALID_REFRESH_TOKEN");

  if (doc.usedAt) {
    await revokeRefreshTokenFamily(doc.familyId);
    throw AppError.unauthorized("Refresh token reuse detected", "REFRESH_TOKEN_REUSED");
  }
  if (doc.expiresAt.getTime() <= Date.now()) {
    await revokeRefreshTokenFamily(doc.familyId);
    throw AppError.unauthorized("Refresh token expired", "REFRESH_TOKEN_EXPIRED");
  }

  const [extension, authUser] = await Promise.all([
    userRepository.findUserExtension(doc.userId),
    userRepository.findAuthUserById(doc.userId),
  ]);
  if (!extension || !authUser) {
    await revokeRefreshTokenFamily(doc.familyId);
    throw AppError.unauthorized("Account no longer exists", "INVALID_REFRESH_TOKEN");
  }

  await markRefreshTokenUsed(refreshToken);
  const newToken = generateOpaqueToken("rt");
  await storeRefreshToken({
    token: newToken,
    userId: doc.userId,
    familyId: doc.familyId,
    ttlSeconds: config.refreshTokenTtlSeconds,
  });

  const role = extension.role as Role;
  const accessToken = signAccessToken({
    sub: doc.userId,
    type: "user",
    role,
    permissions: getPermissionsForRole(role),
    emailVerified: authUser.emailVerified,
    expiresInSeconds: config.accessTokenTtlSeconds,
  });

  return { accessToken, refreshToken: newToken, expiresIn: config.accessTokenTtlSeconds };
}

export async function logoutUser(input: {
  jti: string;
  subjectId: string;
  ttlSeconds: number;
  refreshToken?: string;
}): Promise<void> {
  await revokeAccessToken({ jti: input.jti, userId: input.subjectId, ttlSeconds: input.ttlSeconds });

  if (input.refreshToken) {
    const doc = await findRefreshToken(input.refreshToken);
    if (doc) await revokeRefreshTokenFamily(doc.familyId);
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const profile = await buildProfile(userId);
  if (!profile) throw AppError.notFound("User not found", "USER_NOT_FOUND");
  return profile;
}

export async function listUsers(page: number, limit: number): Promise<UserListResult> {
  const { rows, total } = await userRepository.listUserExtensions(page, limit);
  const authUsers = await userRepository.findAuthUsersByIds(rows.map((row) => row.userId));
  const byId = new Map(authUsers.map((user) => [user.id, user]));

  const users: UserProfile[] = rows.map((row) => {
    const authUser = byId.get(row.userId);
    const role = row.role as Role;
    return {
      id: row.userId,
      email: authUser?.email ?? row.email,
      name: authUser?.name ?? "",
      role,
      emailVerified: authUser?.emailVerified ?? false,
      permissions: getPermissionsForRole(role),
      createdAt: authUser?.createdAt ?? row.createdAt,
    };
  });

  return { users, pagination: { page, limit, total } };
}

export async function createUserByAdmin(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
}): Promise<UserProfile> {
  const { profile } = await registerUser(input);
  return profile;
}

export async function updateUserByAdmin(
  userId: string,
  patch: { name?: string; role?: Role; emailVerified?: boolean }
): Promise<UserProfile> {
  const existing = await buildProfile(userId);
  if (!existing) throw AppError.notFound("User not found", "USER_NOT_FOUND");

  if (patch.role !== undefined && !isRole(patch.role)) {
    throw AppError.badRequest("Invalid role", "INVALID_ROLE");
  }

  const roleChanged = patch.role !== undefined && patch.role !== existing.role;

  if (patch.name !== undefined) await userRepository.updateAuthUser(userId, { name: patch.name });
  if (patch.emailVerified !== undefined) await userRepository.updateAuthUser(userId, { emailVerified: patch.emailVerified });
  if (patch.role !== undefined) await userRepository.updateUserExtension(userId, { role: patch.role });

  if (roleChanged && patch.role) {
    publishAuthEvent("user.role.changed", {
      userId,
      email: existing.email,
      previousRole: existing.role,
      newRole: patch.role,
    });
    await revokeAllUserRefreshTokens(userId);
  } else {
    publishAuthEvent("user.updated", { userId, email: existing.email, changes: patch });
  }

  const profile = await buildProfile(userId);
  if (!profile) throw AppError.notFound("User not found", "USER_NOT_FOUND");
  return profile;
}

export async function deleteUserByAdmin(userId: string, actorId: string): Promise<void> {
  if (userId === actorId) {
    throw AppError.badRequest("You cannot delete your own account", "SELF_OPERATION");
  }
  const existing = await buildProfile(userId);
  if (!existing) throw AppError.notFound("User not found", "USER_NOT_FOUND");

  await userRepository.deleteAuthUser(userId);
  await userRepository.deleteUserExtension(userId);
  await revokeAllUserRefreshTokens(userId);

  publishAuthEvent("user.deleted", { userId, email: existing.email });
}
