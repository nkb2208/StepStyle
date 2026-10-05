import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import "./helpers/env";
import { generateKeyPairSync } from "node:crypto";
import { sign as jwtSign } from "jsonwebtoken";
import { configureAuth, resetAuthGuard } from "@ngocanh-auth/auth-express";
import { JwksVerifier } from "@ngocanh-auth/auth-types";
import { createProductApp } from "../services/product-service/src/app";
import { connectProductDb, getProducts } from "../services/product-service/src/db";
import { createOrderApp } from "../services/order-service/src/app";
import { connectOrderDb, getOrders } from "../services/order-service/src/db";
import { createApp } from "../src/app";
import { registerUser } from "../src/modules/users/user.service";
import {
  ensureMongo,
  request,
  resetAuthState,
  startServer,
  uniqueEmail,
  type RunningServer,
} from "./helpers/harness";

let authServer: RunningServer;
let productServer: RunningServer;
let orderServer: RunningServer;

let authUrl: string;
let productUrl: string;
let orderUrl: string;

let adminToken = "";
let sellerAToken = "";
let sellerBToken = "";
let customerToken = "";
let customerId = "";
let customer2Token = "";

const password = "Password123!";

async function login(url: string, email: string, pw: string): Promise<string> {
  const res = await request(url, "POST", "/api/auth/login", { body: { email, password: pw } });
  expect(res.status).toBe(200);
  return res.body.data.accessToken;
}

beforeAll(async () => {
  await resetAuthState();

  const uri = await ensureMongo();
  await connectProductDb(`${uri}product-db-test`);
  await connectOrderDb(`${uri}order-db-test`);
  await getProducts().deleteMany({});
  await getOrders().deleteMany({});

  authServer = await startServer(createApp());
  productServer = await startServer(createProductApp());
  orderServer = await startServer(createOrderApp());
  authUrl = authServer.url;
  productUrl = productServer.url;
  orderUrl = orderServer.url;

  await configureAuth({
    jwksUrl: `${authUrl}/.well-known/jwks.json`,
    issuer: "auth.test.local",
    audience: "api.test.local",
    clockToleranceSeconds: 5,
  });

  const adminEmail = uniqueEmail("admin");
  await registerUser({ email: adminEmail, password, name: "Downstream Admin", role: "ADMIN" });
  adminToken = await login(authUrl, adminEmail, password);

  const sellerAEmail = uniqueEmail("seller-a");
  const sellerA = await request(authUrl, "POST", "/api/auth/register", {
    body: { email: sellerAEmail, password, name: "Seller A", role: "SELLER" },
  });
  sellerAToken = sellerA.body.data.accessToken;

  const sellerBEmail = uniqueEmail("seller-b");
  const sellerB = await request(authUrl, "POST", "/api/auth/register", {
    body: { email: sellerBEmail, password, name: "Seller B", role: "SELLER" },
  });
  sellerBToken = sellerB.body.data.accessToken;

  const customerEmail = uniqueEmail("customer");
  const customer = await request(authUrl, "POST", "/api/auth/register", {
    body: { email: customerEmail, password, name: "Customer One" },
  });
  customerToken = customer.body.data.accessToken;
  customerId = customer.body.data.user.id;

  const customer2Email = uniqueEmail("customer-2");
  const customer2 = await request(authUrl, "POST", "/api/auth/register", {
    body: { email: customer2Email, password, name: "Customer Two" },
  });
  customer2Token = customer2.body.data.accessToken;
});

afterAll(async () => {
  resetAuthGuard();
  await Promise.all([authServer.close(), productServer.close(), orderServer.close()]);
});

describe("jwks: stateless verification", () => {
  test("publishes an RS256 JWKS document", async () => {
    const res = await request(authUrl, "GET", "/.well-known/jwks.json");
    expect(res.status).toBe(200);
    expect(res.body.keys).toBeArray();
    expect(res.body.keys.length).toBeGreaterThan(0);
    expect(res.body.keys[0].kty).toBe("RSA");
    expect(res.body.keys[0].alg).toBe("RS256");
    expect(res.body.keys[0].kid).toBeString();
  });

  test("shared JwksVerifier verifies tokens fetched from the JWKS endpoint", async () => {
    const registerRes = await request(authUrl, "POST", "/api/auth/register", {
      body: { email: uniqueEmail("jwks-verify"), password, name: "JWKS Verify" },
    });

    const token: string = registerRes.body.data.accessToken;
    const verifier = new JwksVerifier({
      jwksUrl: `${authUrl}/.well-known/jwks.json`,
      issuer: "auth.test.local",
      audience: "api.test.local",
    });
    await verifier.init();
    const payload = await verifier.verify(token);
    expect(payload.sub).toBe(registerRes.body.data.user.id);
    expect(payload.type).toBe("user");
    expect(payload.permissions).toContain("order:create");
  });

  test("rejects a token signed with a foreign key", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const forged = jwtSign(
      { sub: "attacker", type: "user", role: "ADMIN", permissions: ["*:*"], jti: "x" },
      privateKey,
      { algorithm: "RS256", issuer: "auth.test.local", audience: "api.test.local", expiresIn: "5m" }
    );

    const res = await request(productUrl, "GET", "/api/products", { token: forged });
    expect(res.status).toBe(401);
  });

  test("rejects an expired token", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const expired = jwtSign(
      { sub: "x", type: "user", role: "CUSTOMER", permissions: ["product:read"], jti: "y" },
      privateKey,
      { algorithm: "RS256", issuer: "auth.test.local", audience: "api.test.local", expiresIn: -10 }
    );

    const res = await request(productUrl, "GET", "/api/products", { token: expired });
    expect(res.status).toBe(401);
  });
});

describe("product-service: authentication", () => {
  test("rejects missing token", async () => {
    const res = await request(productUrl, "GET", "/api/products");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("MISSING_TOKEN");
  });

  test("rejects garbage token", async () => {
    const res = await request(productUrl, "GET", "/api/products", { token: "garbage" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  test("rejects tampered signature", async () => {
    const registerRes = await request(authUrl, "POST", "/api/auth/register", {
      body: { email: uniqueEmail("tamper"), password, name: "Tamper User" },
    });
    const token: string = registerRes.body.data.accessToken;
    const parts = token.split(".");
    const signature = parts[2] ?? "";
    const mid = Math.floor(signature.length / 2);
    const flipped = signature[mid] === "A" ? "B" : "A";
    const tampered = `${parts[0]}.${parts[1]}.${signature.slice(0, mid)}${flipped}${signature.slice(mid + 1)}`;
    const res = await request(productUrl, "GET", "/api/products", { token: tampered });
    expect(res.status).toBe(401);
  });
});

describe("product-service: RBAC and ownership", () => {
  let productId = "";

  test("SELLER can create a product", async () => {
    const res = await request(productUrl, "POST", "/api/products", {
      token: sellerAToken,
      body: { name: "Espresso Machine", description: "Barista grade", price: 499.99, stock: 5 },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.product.ownerId).toBeString();
    expect(res.body.data.product.price).toBe(499.99);
    productId = res.body.data.product.id;
  });

  test("CUSTOMER cannot create a product (missing product:create)", async () => {
    const res = await request(productUrl, "POST", "/api/products", {
      token: customerToken,
      body: { name: "Cheap Knockoff", price: 1 },
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  test("CUSTOMER can read products", async () => {
    const res = await request(productUrl, "GET", "/api/products", { token: customerToken });
    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBeGreaterThan(0);
  });

  test("another SELLER cannot update someone else's product (ownership)", async () => {
    const res = await request(productUrl, "PUT", `/api/products/${productId}`, {
      token: sellerBToken,
      body: { price: 1 },
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  test("ADMIN can update any product (wildcard role)", async () => {
    const res = await request(productUrl, "PUT", `/api/products/${productId}`, {
      token: adminToken,
      body: { price: 449.99 },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.product.price).toBe(449.99);
  });

  test("the owning SELLER can update their own product", async () => {
    const res = await request(productUrl, "PUT", `/api/products/${productId}`, {
      token: sellerAToken,
      body: { stock: 12 },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.product.stock).toBe(12);
  });

  test("unknown product returns 404", async () => {
    const res = await request(productUrl, "GET", "/api/products/prd_missing", { token: customerToken });
    expect(res.status).toBe(404);
  });

  test("SELLER can delete their product; CUSTOMER cannot", async () => {
    const created = await request(productUrl, "POST", "/api/products", {
      token: sellerBToken,
      body: { name: "Temp Product", price: 5 },
    });
    const tempId = created.body.data.product.id;

    const byCustomer = await request(productUrl, "DELETE", `/api/products/${tempId}`, {
      token: customerToken,
    });
    expect(byCustomer.status).toBe(403);

    const byOwner = await request(productUrl, "DELETE", `/api/products/${tempId}`, {
      token: sellerBToken,
    });
    expect(byOwner.status).toBe(200);
  });
});

describe("order-service: RBAC and ownership", () => {
  let orderId = "";

  test("CUSTOMER can place an order (demo pricing mode)", async () => {
    const res = await request(orderUrl, "POST", "/api/orders", {
      token: customerToken,
      body: { productId: "prd_demo_1", quantity: 3, unitPrice: 19.99, productName: "Coffee Beans" },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.order.total).toBe(59.97);
    expect(res.body.data.order.status).toBe("pending");
    expect(res.body.data.order.ownerId).toBe(customerId);
    orderId = res.body.data.order.id;
  });

  test("order creation requires pricing when the Product service is not configured", async () => {
    const res = await request(orderUrl, "POST", "/api/orders", {
      token: customerToken,
      body: { productId: "prd_demo_2", quantity: 1 },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PRODUCT_UNAVAILABLE");
  });

  test("another CUSTOMER cannot read someone else's order", async () => {
    const res = await request(orderUrl, "GET", `/api/orders/${orderId}`, { token: customer2Token });
    expect(res.status).toBe(404);
  });

  test("CUSTOMER list only contains their own orders", async () => {
    const mine = await request(orderUrl, "GET", "/api/orders", { token: customerToken });
    expect(mine.status).toBe(200);
    expect(mine.body.data.orders.map((order: { id: string }) => order.id)).toContain(orderId);

    const theirs = await request(orderUrl, "GET", "/api/orders", { token: customer2Token });
    expect(theirs.status).toBe(200);
    expect(theirs.body.data.orders.map((order: { id: string }) => order.id)).not.toContain(orderId);
  });

  test("ADMIN list sees every order", async () => {
    const res = await request(orderUrl, "GET", "/api/orders", { token: adminToken });
    expect(res.status).toBe(200);
    expect(res.body.data.orders.map((order: { id: string }) => order.id)).toContain(orderId);
  });

  test("CUSTOMER cannot update order status (missing order:update)", async () => {
    const res = await request(orderUrl, "PATCH", `/api/orders/${orderId}/status`, {
      token: customerToken,
      body: { status: "paid" },
    });
    expect(res.status).toBe(403);
  });

  test("SELLER can update order status", async () => {
    const res = await request(orderUrl, "PATCH", `/api/orders/${orderId}/status`, {
      token: sellerAToken,
      body: { status: "paid" },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe("paid");
  });

  test("rejects invalid status values", async () => {
    const res = await request(orderUrl, "PATCH", `/api/orders/${orderId}/status`, {
      token: adminToken,
      body: { status: "exploded" },
    });
    expect(res.status).toBe(400);
  });
});

describe("service-to-service (client_credentials)", () => {
  let clientId = "";
  let clientSecret = "";

  test("ADMIN registers a service client and receives the secret once", async () => {
    const res = await request(authUrl, "POST", "/api/services", {
      token: adminToken,
      body: { name: "order-readers", scopes: ["product:read", "order:read"] },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.client.clientId).toStartWith("svc_");
    expect(res.body.data.client.secretHash).toBeUndefined();
    clientId = res.body.data.client.clientId;
    clientSecret = res.body.data.client.clientSecret;
  });

  test("exchanges client credentials for a service access token", async () => {
    const res = await request(authUrl, "POST", "/api/auth/token", {
      body: { grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.tokenType).toBe("Bearer");
    expect(res.body.data.scopes).toEqual(["product:read", "order:read"]);

    const claims = JSON.parse(Buffer.from(res.body.data.accessToken.split(".")[1]!, "base64url").toString());
    expect(claims.type).toBe("service");
    expect(claims.sub).toBe(clientId);
    expect(claims.permissions).toEqual(["product:read", "order:read"]);
    expect(claims).not.toHaveProperty("role");
  });

  test("service token can call product:read routes", async () => {
    const grant = await request(authUrl, "POST", "/api/auth/token", {
      body: { grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret },
    });
    const serviceToken = grant.body.data.accessToken;

    const list = await request(productUrl, "GET", "/api/products", { token: serviceToken });
    expect(list.status).toBe(200);

    const create = await request(productUrl, "POST", "/api/products", {
      token: serviceToken,
      body: { name: "Should Fail", price: 1 },
    });
    expect(create.status).toBe(403);
  });

  test("service token cannot access admin-only user routes", async () => {
    const grant = await request(authUrl, "POST", "/api/auth/token", {
      body: { grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret },
    });
    const res = await request(authUrl, "GET", "/api/users", { token: grant.body.data.accessToken });
    expect(res.status).toBe(403);
  });

  test("rejects a wrong client secret", async () => {
    const res = await request(authUrl, "POST", "/api/auth/token", {
      body: { grant_type: "client_credentials", client_id: clientId, client_secret: "cs_wrong" },
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CLIENT");
  });

  test("rejects an unknown client id", async () => {
    const res = await request(authUrl, "POST", "/api/auth/token", {
      body: { grant_type: "client_credentials", client_id: "svc_missing", client_secret: "x" },
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CLIENT");
  });

  test("rejects scope escalation", async () => {
    const res = await request(authUrl, "POST", "/api/auth/token", {
      body: {
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "user:*",
      },
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("INVALID_SCOPE");
  });

  test("a revoked client can no longer get tokens", async () => {
    const created = await request(authUrl, "POST", "/api/services", {
      token: adminToken,
      body: { name: "temporary", scopes: ["product:read"] },
    });
    const tempId = created.body.data.client.clientId;
    const tempSecret = created.body.data.client.clientSecret;

    const before = await request(authUrl, "POST", "/api/auth/token", {
      body: { grant_type: "client_credentials", client_id: tempId, client_secret: tempSecret },
    });
    expect(before.status).toBe(200);

    const revoke = await request(authUrl, "DELETE", `/api/services/${tempId}`, { token: adminToken });
    expect(revoke.status).toBe(200);

    const after = await request(authUrl, "POST", "/api/auth/token", {
      body: { grant_type: "client_credentials", client_id: tempId, client_secret: tempSecret },
    });
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe("INVALID_CLIENT");
  });

  test("service client secrets are stored hashed", async () => {
    const { getDB } = await import("../src/infrastructure/database");
    const doc = await getDB().collection("service_clients").findOne({ clientId });
    expect(doc).not.toBeNull();
    expect(doc!.secretHash).not.toBe(clientSecret);
    expect(String(doc!.secretHash)).not.toContain(clientSecret);
  });
});
