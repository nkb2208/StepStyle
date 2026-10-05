import { ObjectId } from "mongodb";
import { getDB } from "../../infrastructure/database";

export interface UserExtension {
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
}

interface AuthUserDoc {
  _id: ObjectId;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

function extensions() {
  return getDB().collection<UserExtension>("users_extended");
}

function authUsers() {
  return getDB().collection<AuthUserDoc>("user");
}

function toAuthUser(doc: AuthUserDoc | null): AuthUser | null {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name ?? "",
    emailVerified: doc.emailVerified ?? false,
    createdAt: doc.createdAt,
  };
}

function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function upsertUserExtension(input: { userId: string; email: string; role: string }): Promise<void> {
  const now = new Date();
  await extensions().updateOne(
    { userId: input.userId },
    { $setOnInsert: { userId: input.userId, email: input.email, role: input.role, createdAt: now, updatedAt: now } },
    { upsert: true }
  );
}

export async function findUserExtension(userId: string): Promise<UserExtension | null> {
  return extensions().findOne({ userId });
}

export async function findUserExtensionByEmail(email: string): Promise<UserExtension | null> {
  return extensions().findOne({ email: email.toLowerCase() });
}

export async function ensureUserExtension(input: { userId: string; email: string; role?: string }): Promise<UserExtension> {
  const existing = await findUserExtension(input.userId);
  if (existing) return existing;
  await upsertUserExtension({ userId: input.userId, email: input.email, role: input.role ?? "CUSTOMER" });
  const created = await findUserExtension(input.userId);
  if (!created) throw new Error("Failed to persist user extension");
  return created;
}

export async function updateUserExtension(userId: string, patch: Partial<Pick<UserExtension, "email" | "role">>): Promise<void> {
  await extensions().updateOne({ userId }, { $set: { ...patch, updatedAt: new Date() } });
}

export async function deleteUserExtension(userId: string): Promise<void> {
  await extensions().deleteOne({ userId });
}

export async function listUserExtensions(page: number, limit: number): Promise<{ rows: UserExtension[]; total: number }> {
  const [rows, total] = await Promise.all([
    extensions()
      .find({})
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    extensions().countDocuments(),
  ]);
  return { rows, total };
}

export async function findAuthUserById(id: string): Promise<AuthUser | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  return toAuthUser(await authUsers().findOne({ _id }));
}

export async function findAuthUserByEmail(email: string): Promise<AuthUser | null> {
  return toAuthUser(await authUsers().findOne({ email: email.toLowerCase() }));
}

export async function findAuthUsersByIds(ids: string[]): Promise<AuthUser[]> {
  const objectIds = ids.map(toObjectId).filter((value): value is ObjectId => value !== null);
  if (objectIds.length === 0) return [];
  const docs = await authUsers().find({ _id: { $in: objectIds } }).toArray();
  return docs.map((doc) => toAuthUser(doc)).filter((user): user is AuthUser => user !== null);
}

export async function updateAuthUser(id: string, patch: Partial<Pick<AuthUser, "name" | "emailVerified">>): Promise<void> {
  const _id = toObjectId(id);
  if (!_id) return;
  await authUsers().updateOne({ _id }, { $set: { ...patch, updatedAt: new Date() } });
}

export async function deleteAuthUser(id: string): Promise<void> {
  const _id = toObjectId(id);
  if (!_id) return;
  await authUsers().deleteOne({ _id });
  await getDB().collection("account").deleteMany({ userId: _id });
  await getDB().collection("session").deleteMany({ userId: _id });
}
