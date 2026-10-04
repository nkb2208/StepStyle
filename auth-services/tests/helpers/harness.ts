import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { once } from "node:events";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, disconnectDB, getDB } from "../../src/infrastructure/database";
import { clearOutbox, getOutbox, type SentEmail } from "../../src/infrastructure/email";
import { resetAuthInstance } from "../../src/lib/auth";

let mongo: MongoMemoryServer | null = null;
let baseUri = "";
let stopped = false;

export async function ensureMongo(): Promise<string> {
  if (mongo && !stopped) return baseUri;
  mongo = await MongoMemoryServer.create();
  baseUri = mongo.getUri();
  stopped = false;
  return baseUri;
}

export async function connectAuthDb(): Promise<void> {
  const uri = await ensureMongo();
  try {
    getDB();
  } catch {
    await connectDB(`${uri}auth-db-test`);
    resetAuthInstance();
  }
}

const AUTH_COLLECTIONS = [
  "user",
  "account",
  "session",
  "verification",
  "users_extended",
  "refresh_tokens",
  "revoked_tokens",
  "service_clients",
];

export async function resetAuthState(): Promise<void> {
  await connectAuthDb();
  const db = getDB();
  for (const name of AUTH_COLLECTIONS) {
    await db.collection(name).deleteMany({});
  }
  clearOutbox();
  resetAuthInstance();
}

export async function stopTestMongo(): Promise<void> {
  await disconnectDB();
  if (mongo && !stopped) {
    await mongo.stop();
    stopped = true;
    mongo = null;
    baseUri = "";
  }
}

export interface RunningServer {
  url: string;
  close(): Promise<void>;
}

export async function startServer(app: {
  listen: (port: number, cb?: () => void) => Server;
}): Promise<RunningServer> {
  const server = app.listen(0);
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export interface TestResponse<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

export async function request<T = any>(
  baseUrl: string,
  method: string,
  path: string,
  options: { token?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<TestResponse<T>> {
  const headers: Record<string, string> = { "content-type": "application/json", ...options.headers };
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body, headers: response.headers };
}

let uniqueCounter = 0;

export function uniqueEmail(prefix: string): string {
  uniqueCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uniqueCounter}@test.local`;
}

export function outbox(): SentEmail[] {
  return getOutbox();
}

export function findEmail(subject: string, to?: string): SentEmail | undefined {
  return getOutbox().find((email) => email.subject.includes(subject) && (!to || email.to === to));
}

export function extractToken(link: string): string {
  const match = /[?&]token=([^&\s"'<>]+)/.exec(link);
  if (!match?.[1]) throw new Error(`No token found in link: ${link}`);
  return decodeURIComponent(match[1]);
}

export function tokenFromEmail(email: SentEmail): string {
  const match = /[?&]token=([^&\s"'<>]+)/.exec(email.html + " " + (email.text ?? ""));
  if (!match?.[1]) throw new Error(`No token found in email: ${email.subject}`);
  return decodeURIComponent(match[1]);
}

export async function waitFor<T>(probe: () => T | undefined | null | false, timeoutMs = 3000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T | undefined | null | false;
  while (Date.now() < deadline) {
    last = probe();
    if (last) return last as T;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms (last value: ${String(last)})`);
}
