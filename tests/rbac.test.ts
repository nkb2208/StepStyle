import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import "./helpers/env";
import { createApp } from "../src/app";
import { AuthorizationService } from "../src/modules/authorization/authorization.service";
import { registerUser } from "../src/modules/users/user.service";
import {
  request,
  resetAuthState,
  startServer,
  uniqueEmail,
  type RunningServer,
} from "./helpers/harness";

let server: RunningServer;
let url: string;

let adminToken = "";
let adminEmail = "";
let sellerToken = "";
let sellerEmail = "";
let customerToken = "";
let customerEmail = "";
let customerId = "";

async function login(email: string, password: string): Promise<string> {
  const res = await request(url, "POST", "/api/auth/login", { body: { email, password } });
  expect(res.status).toBe(200);
  return res.body.data.accessToken;
}

beforeAll(async () => {
  await resetAuthState();
  server = await startServer(createApp());
  url = server.url;

  const password = "AdminPass123!";

  adminEmail = uniqueEmail("admin");
  await registerUser({ email: adminEmail, password, name: "Test Admin", role: "ADMIN" });
  adminToken = await login(adminEmail, password);

  sellerEmail = uniqueEmail("seller");
  const sellerReg = await request(url, "POST", "/api/auth/register", {
    body: { email: sellerEmail, password: "SellerPass123!", name: "Test Seller", role: "SELLER" },
  });
  sellerToken = sellerReg.body.data.accessToken;

  customerEmail = uniqueEmail("customer");
  const customerReg = await request(url, "POST", "/api/auth/register", {
    body: { email: customerEmail, password: "CustomerPass123!", name: "Test Customer" },
  });
  customerToken = customerReg.body.data.accessToken;
  customerId = customerReg.body.data.user.id;
});

afterAll(async () => {
  await server.close();
});

describe("rbac: unit-level wildcard evaluation", () => {
  test("ADMIN holds the wildcard permission", () => {
    expect(AuthorizationService.can("ADMIN", "anything:at:all")).toBe(true);
    expect(AuthorizationService.can("ADMIN", "user:delete")).toBe(true);
  });

  test("CUSTOMER is limited to the customer scope", () => {
    expect(AuthorizationService.can("CUSTOMER", "product:read")).toBe(true);
    expect(AuthorizationService.can("CUSTOMER", "order:create")).toBe(true);
    expect(AuthorizationService.can("CUSTOMER", "product:create")).toBe(false);
    expect(AuthorizationService.can("CUSTOMER", "user:create")).toBe(false);
    expect(AuthorizationService.can("CUSTOMER", "order:update")).toBe(false);
  });

  test("SELLER wildcard covers products but not user management", () => {
    expect(AuthorizationService.can("SELLER", "product:create")).toBe(true);
    expect(AuthorizationService.can("SELLER", "product:delete")).toBe(true);
    expect(AuthorizationService.can("SELLER", "order:update")).toBe(true);
    expect(AuthorizationService.can("SELLER", "user:create")).toBe(false);
    expect(AuthorizationService.can("SELLER", "order:create")).toBe(false);
  });

  test("canAny / canAll semantics", () => {
    expect(AuthorizationService.canAny("CUSTOMER", ["product:create", "order:read"])).toBe(true);
    expect(AuthorizationService.canAny("CUSTOMER", ["product:create", "user:create"])).toBe(false);
    expect(AuthorizationService.canAll("SELLER", ["product:read", "order:update"])).toBe(true);
    expect(AuthorizationService.canAll("SELLER", ["product:read", "user:create"])).toBe(false);
  });
});

describe("rbac: /api/users access control", () => {
  test("unauthenticated request is rejected", async () => {
    const res = await request(url, "GET", "/api/users");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("MISSING_TOKEN");
  });

  test("ADMIN can list users", async () => {
    const res = await request(url, "GET", "/api/users", { token: adminToken });
    expect(res.status).toBe(200);
    expect(res.body.data.users).toBeArray();
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 20 });
    const emails = res.body.data.users.map((user: { email: string }) => user.email);
    expect(emails).toContain(customerEmail);
    const ids = res.body.data.users.map((user: { id: string }) => user.id);
    expect(ids).toContain(customerId);
  });

  test("CUSTOMER cannot list users", async () => {
    const res = await request(url, "GET", "/api/users", { token: customerToken });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  test("SELLER cannot list users", async () => {
    const res = await request(url, "GET", "/api/users", { token: sellerToken });
    expect(res.status).toBe(403);
  });

  test("pagination parameters are honoured", async () => {
    const res = await request(url, "GET", "/api/users?page=1&limit=1", { token: adminToken });
    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBe(1);
    expect(res.body.data.pagination.limit).toBe(1);
  });
});

describe("rbac: user management endpoints", () => {
  let createdUserId = "";
  let createdEmail = "";

  test("SELLER cannot create users (missing user:create)", async () => {
    const res = await request(url, "POST", "/api/users", {
      token: sellerToken,
      body: { email: uniqueEmail("nope"), password: "Password123!", name: "Nope", role: "CUSTOMER" },
    });
    expect(res.status).toBe(403);
  });

  test("CUSTOMER cannot create users", async () => {
    const res = await request(url, "POST", "/api/users", {
      token: customerToken,
      body: { email: uniqueEmail("nope2"), password: "Password123!", name: "Nope Two", role: "CUSTOMER" },
    });
    expect(res.status).toBe(403);
  });

  test("ADMIN can create a user with any role", async () => {
    createdEmail = uniqueEmail("created");
    const res = await request(url, "POST", "/api/users", {
      token: adminToken,
      body: { email: createdEmail, password: "Password123!", name: "Created User", role: "SELLER" },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("SELLER");
    createdUserId = res.body.data.user.id;
  });

  test("ADMIN can change a user role (revokes their refresh tokens)", async () => {
    const createdLogin = await request(url, "POST", "/api/auth/login", {
      body: { email: createdEmail, password: "Password123!" },
    });
    expect(createdLogin.status).toBe(200);
    const refreshToken = createdLogin.body.data.refreshToken;
    const oldRoleToken = createdLogin.body.data.accessToken;

    const res = await request(url, "PATCH", `/api/users/${createdUserId}`, {
      token: adminToken,
      body: { role: "CUSTOMER" },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe("CUSTOMER");

    const refresh = await request(url, "POST", "/api/auth/refresh", { body: { refreshToken } });
    expect(refresh.status).toBe(401);

    const relogin = await request(url, "POST", "/api/auth/login", {
      body: { email: createdEmail, password: "Password123!" },
    });
    expect(relogin.status).toBe(200);
    const me = await request(url, "GET", "/api/auth/me", { token: relogin.body.data.accessToken });
    expect(me.body.data.user.role).toBe("CUSTOMER");

    const stale = await request(url, "GET", "/api/auth/me", { token: oldRoleToken });
    expect(stale.status).toBe(200);
    expect(stale.body.data.user.role).toBe("CUSTOMER");
  });

  test("ADMIN can update a user's name", async () => {
    const res = await request(url, "PATCH", `/api/users/${createdUserId}`, {
      token: adminToken,
      body: { name: "Renamed User" },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe("Renamed User");
  });

  test("SELLER cannot update users", async () => {
    const res = await request(url, "PATCH", `/api/users/${createdUserId}`, {
      token: sellerToken,
      body: { name: "Hacked" },
    });
    expect(res.status).toBe(403);
  });

  test("ADMIN can delete another user; that account can no longer log in", async () => {
    const res = await request(url, "DELETE", `/api/users/${createdUserId}`, { token: adminToken });
    expect(res.status).toBe(200);

    const login = await request(url, "POST", "/api/auth/login", {
      body: { email: createdEmail, password: "Password123!" },
    });
    expect(login.status).toBe(401);
  });

  test("ADMIN cannot delete their own account", async () => {
    const me = await request(url, "GET", "/api/auth/me", { token: adminToken });
    const realId = me.body.data.user.id;

    const real = await request(url, "DELETE", `/api/users/${realId}`, { token: adminToken });
    expect(real.status).toBe(400);
    expect(real.body.error.code).toBe("SELF_OPERATION");

    const stillWorks = await request(url, "GET", "/api/auth/me", { token: adminToken });
    expect(stillWorks.status).toBe(200);
  });

  test("deleting a non-existent user returns 404", async () => {
    const res = await request(url, "DELETE", "/api/users/nonexistent-id-123", { token: adminToken });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });
});

describe("rbac: service client management is admin-only", () => {
  test("CUSTOMER cannot list service clients", async () => {
    const res = await request(url, "GET", "/api/services", { token: customerToken });
    expect(res.status).toBe(403);
  });

  test("SELLER cannot register service clients", async () => {
    const res = await request(url, "POST", "/api/services", {
      token: sellerToken,
      body: { name: "sneaky", scopes: ["product:read"] },
    });
    expect(res.status).toBe(403);
  });

  test("ADMIN can list service clients", async () => {
    const res = await request(url, "GET", "/api/services", { token: adminToken });
    expect(res.status).toBe(200);
    expect(res.body.data.clients).toBeArray();
  });
});
