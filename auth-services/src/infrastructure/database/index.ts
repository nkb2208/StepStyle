import { createHash, randomUUID } from "node:crypto";
import { MongoClient, type Db, type Collection } from "mongodb";
import { config } from "../../config";
import { logger } from "../logger";

let client: MongoClient | null = null;
let db: Db | null = null;

function resolveDbName(uri: string): string {
  try {
    const pathname = new URL(uri).pathname.replace(/^\//, "");
    return pathname || "auth-db";
  } catch {
    return "auth-db";
  }
}

export async function connectDB(uri: string = process.env.MONGODB_URI ?? config.mongoUri): Promise<Db> {
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(resolveDbName(uri));
  await ensureIndexes(db);
  logger.info("Connected to MongoDB", { database: db.databaseName });
  return db;
}

export function getDB(): Db {
  if (!db) throw new Error("Database not initialized. Call connectDB() first.");
  return db;
}

export async function disconnectDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

async function ensureIndexes(database: Db): Promise<void> {
  await database.collection("users_extended").createIndex({ userId: 1 }, { unique: true });
  await database.collection("users_extended").createIndex({ email: 1 }, { unique: true });
  await database.collection("refresh_tokens").createIndex({ tokenHash: 1 }, { unique: true });
  await database.collection("refresh_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await database.collection("refresh_tokens").createIndex({ userId: 1, familyId: 1 });
  await database.collection("revoked_tokens").createIndex({ jti: 1 }, { unique: true });
  await database.collection("revoked_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await database.collection("service_clients").createIndex({ clientId: 1 }, { unique: true });
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface RefreshTokenDoc {
  tokenHash: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface RevokedTokenDoc {
  jti: string;
  userId: string;
  revokedAt: Date;
  expiresAt: Date;
}

export interface ServiceClientDoc {
  clientId: string;
  name: string;
  secretHash: string;
  scopes: string[];
  createdAt: Date;
  revokedAt: Date | null;
}

function refreshTokens(): Collection<RefreshTokenDoc> {
  return getDB().collection<RefreshTokenDoc>("refresh_tokens");
}

function revokedTokens(): Collection<RevokedTokenDoc> {
  return getDB().collection<RevokedTokenDoc>("revoked_tokens");
}

function serviceClients(): Collection<ServiceClientDoc> {
  return getDB().collection<ServiceClientDoc>("service_clients");
}

export function generateOpaqueToken(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`;
}

export function generateFamilyId(): string {
  return randomUUID();
}

export async function storeRefreshToken(input: {
  token: string;
  userId: string;
  familyId: string;
  ttlSeconds: number;
}): Promise<RefreshTokenDoc> {
  const now = new Date();
  const doc: RefreshTokenDoc = {
    tokenHash: hashToken(input.token),
    userId: input.userId,
    familyId: input.familyId,
    expiresAt: new Date(now.getTime() + input.ttlSeconds * 1000),
    usedAt: null,
    createdAt: now,
  };
  await refreshTokens().insertOne(doc);
  return doc;
}

export async function findRefreshToken(token: string): Promise<RefreshTokenDoc | null> {
  return refreshTokens().findOne({ tokenHash: hashToken(token) });
}

export async function markRefreshTokenUsed(token: string): Promise<void> {
  await refreshTokens().updateOne({ tokenHash: hashToken(token) }, { $set: { usedAt: new Date() } });
}

export async function revokeRefreshTokenFamily(familyId: string): Promise<number> {
  const result = await refreshTokens().deleteMany({ familyId });
  return result.deletedCount ?? 0;
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<number> {
  const result = await refreshTokens().deleteMany({ userId });
  return result.deletedCount ?? 0;
}

export async function revokeAccessToken(input: { jti: string; userId: string; ttlSeconds: number }): Promise<void> {
  await revokedTokens().updateOne(
    { jti: input.jti },
    {
      $set: {
        jti: input.jti,
        userId: input.userId,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + input.ttlSeconds * 1000),
      },
    },
    { upsert: true }
  );
}

export async function isAccessTokenRevoked(jti: string): Promise<boolean> {
  const doc = await revokedTokens().findOne({ jti }, { projection: { _id: 1 } });
  return doc !== null;
}

export async function createServiceClient(input: {
  name: string;
  secretHash: string;
  scopes: string[];
}): Promise<ServiceClientDoc> {
  const doc: ServiceClientDoc = {
    clientId: `svc_${randomUUID().replaceAll("-", "").slice(0, 24)}`,
    name: input.name,
    secretHash: input.secretHash,
    scopes: input.scopes,
    createdAt: new Date(),
    revokedAt: null,
  };
  await serviceClients().insertOne(doc);
  return doc;
}

export async function findServiceClient(clientId: string): Promise<ServiceClientDoc | null> {
  return serviceClients().findOne({ clientId });
}

export async function listServiceClients(): Promise<ServiceClientDoc[]> {
  return serviceClients().find({ revokedAt: null }).toArray();
}

export async function revokeServiceClient(clientId: string): Promise<boolean> {
  const result = await serviceClients().updateOne({ clientId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  return result.modifiedCount > 0;
}
