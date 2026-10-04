import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import "./helpers/env";
import { createApp } from "../src/app";
import { config } from "../src/config";
import { getDB } from "../src/infrastructure/database";
import { clearOutbox } from "../src/infrastructure/email";
import {
  extractToken,
  findEmail,
  request,
  resetAuthState,
  startServer,
  tokenFromEmail,
  uniqueEmail,
  waitFor,
  type RunningServer,
} from "./helpers/harness";

function decodeJwt(token: string): Record<string, any> {
  return JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString("utf8"));
}

let server: RunningServer;
let url: string;

beforeAll(async () => {
  await resetAuthState();
  clearOutbox();
  server = await startServer(createApp());
  url = server.url;
});

afterAll(async () => {
  await server.close();
});

describe("auth: registration", () => {
  test("registers a CUSTOMER and returns JWT pair with correct claims", async () => {
    const email = uniqueEmail("customer");
    const res = await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Customer One" },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe("CUSTOMER");
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.accessToken).toBeString();
    expect(res.body.data.refreshToken).toStartWith("rt_");
    expect(res.body.data.tokenType).toBe("Bearer");
    expect(res.body.data.expiresIn).toBe(config.accessTokenTtlSeconds);

    const claims = decodeJwt(res.body.data.accessToken);
    expect(claims.sub).toBe(res.body.data.user.id);
    expect(claims.iss).toBe(config.jwtIssuer);
    expect(claims.aud).toBe(config.jwtAudience);
    expect(claims.type).toBe("user");
    expect(claims.role).toBe("CUSTOMER");
    expect(claims.permissions).toContain("product:read");
    expect(claims.emailVerified).toBe(false);
    expect(claims.jti).toBeString();
    expect(claims).not.toHaveProperty("email");
  });

  test("registers a SELLER with seller permissions", async () => {
    const email = uniqueEmail("seller");
    const res = await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Seller One", role: "SELLER" },
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("SELLER");
    const claims = decodeJwt(res.body.data.accessToken);
    expect(claims.permissions).toContain("product:*");
    expect(claims.permissions).toContain("order:update");
  });

  test("rejects duplicate registration with 409 EMAIL_EXISTS", async () => {
    const email = uniqueEmail("dup");
    const body = { email, password: "Password123!", name: "Dup User" };
    const first = await request(url, "POST", "/api/auth/register", { body });
    expect(first.status).toBe(201);

    const second = await request(url, "POST", "/api/auth/register", { body });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("EMAIL_EXISTS");
  });

  test("rejects ADMIN role at the public registration endpoint", async () => {
    const res = await request(url, "POST", "/api/auth/register", {
      body: { email: uniqueEmail("sneaky"), password: "Password123!", name: "Sneaky Admin", role: "ADMIN" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("rejects weak passwords", async () => {
    const res = await request(url, "POST", "/api/auth/register", {
      body: { email: uniqueEmail("weak"), password: "short", name: "Weak Password" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("auth: login", () => {
  test("logs in with valid credentials", async () => {
    const email = uniqueEmail("login");
    await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Login User" },
    });

    const res = await request(url, "POST", "/api/auth/login", {
      body: { email, password: "Password123!" },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.accessToken).toBeString();
    expect(res.body.data.refreshToken).toStartWith("rt_");
  });

  test("rejects wrong password with 401 INVALID_CREDENTIALS", async () => {
    const email = uniqueEmail("badpw");
    await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Bad Password" },
    });

    const res = await request(url, "POST", "/api/auth/login", {
      body: { email, password: "WrongPassword1!" },
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  test("rejects unknown email with the same error (no user enumeration)", async () => {
    const res = await request(url, "POST", "/api/auth/login", {
      body: { email: uniqueEmail("ghost"), password: "Password123!" },
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  test("rate limiting stays off in tests (many failures still return 401)", async () => {
    const email = uniqueEmail("ratelimit");
    await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Rate Limit" },
    });
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const res = await request(url, "POST", "/api/auth/login", {
        body: { email, password: `Wrong${attempt}Password!` },
      });
      expect(res.status).toBe(401);
    }
  });
});

describe("auth: /me profile", () => {
  test("returns the authenticated user's profile", async () => {
    const email = uniqueEmail("me");
    const registered = await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Me User" },
    });

    const res = await request(url, "GET", "/api/auth/me", { token: registered.body.data.accessToken });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.role).toBe("CUSTOMER");
    expect(res.body.data.user.permissions).toContain("order:create");
    expect(res.body.data.user).not.toHaveProperty("password");
  });

  test("rejects missing token", async () => {
    const res = await request(url, "GET", "/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("MISSING_TOKEN");
  });

  test("rejects garbage token", async () => {
    const res = await request(url, "GET", "/api/auth/me", { token: "not-a-jwt" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });
});

describe("auth: refresh token rotation", () => {
  test("rotates refresh tokens and detects reuse", async () => {
    const email = uniqueEmail("refresh");
    const registered = await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Refresh User" },
    });
    const rt1: string = registered.body.data.refreshToken;

    const firstRefresh = await request(url, "POST", "/api/auth/refresh", { body: { refreshToken: rt1 } });
    expect(firstRefresh.status).toBe(200);
    const rt2: string = firstRefresh.body.data.refreshToken;
    expect(rt2).not.toBe(rt1);
    expect(firstRefresh.body.data.accessToken).toBeString();

    const reuse = await request(url, "POST", "/api/auth/refresh", { body: { refreshToken: rt1 } });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe("REFRESH_TOKEN_REUSED");

    const afterFamilyRevoke = await request(url, "POST", "/api/auth/refresh", { body: { refreshToken: rt2 } });
    expect(afterFamilyRevoke.status).toBe(401);
  });

  test("rejects unknown refresh token", async () => {
    const res = await request(url, "POST", "/api/auth/refresh", {
      body: { refreshToken: "rt_does_not_exist" },
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });

  test("refresh issues a working access token", async () => {
    const email = uniqueEmail("refreshworks");
    const registered = await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Refresh Works" },
    });
    const refreshed = await request(url, "POST", "/api/auth/refresh", {
      body: { refreshToken: registered.body.data.refreshToken },
    });
    const me = await request(url, "GET", "/api/auth/me", { token: refreshed.body.data.accessToken });
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);
  });
});

describe("auth: logout", () => {
  test("revokes the access token and refresh family", async () => {
    const registered = await request(url, "POST", "/api/auth/register", {
      body: { email: uniqueEmail("logout"), password: "Password123!", name: "Logout User" },
    });
    const accessToken: string = registered.body.data.accessToken;
    const refreshToken: string = registered.body.data.refreshToken;

    const before = await request(url, "GET", "/api/auth/me", { token: accessToken });
    expect(before.status).toBe(200);

    const logout = await request(url, "POST", "/api/auth/logout", {
      token: accessToken,
      body: { refreshToken },
    });
    expect(logout.status).toBe(200);

    const after = await request(url, "GET", "/api/auth/me", { token: accessToken });
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe("TOKEN_REVOKED");

    const refresh = await request(url, "POST", "/api/auth/refresh", { body: { refreshToken } });
    expect(refresh.status).toBe(401);
  });
});

describe("auth: password reset flow", () => {
  test("forgot-password always returns a generic message", async () => {
    clearOutbox();
    const known = uniqueEmail("forgot");
    await request(url, "POST", "/api/auth/register", {
      body: { email: known, password: "Password123!", name: "Forgot User" },
    });

    const knownRes = await request(url, "POST", "/api/auth/forgot-password", { body: { email: known } });
    const unknownRes = await request(url, "POST", "/api/auth/forgot-password", {
      body: { email: uniqueEmail("forgot-unknown") },
    });

    expect(knownRes.status).toBe(200);
    expect(unknownRes.status).toBe(200);
    expect(knownRes.body.data.message).toBe(unknownRes.body.data.message);
    expect(knownRes.body.data.message).toContain("If an account exists");
  });

  test("resets the password using the emailed token", async () => {
    clearOutbox();
    const email = uniqueEmail("reset");
    const registered = await request(url, "POST", "/api/auth/register", {
      body: { email, password: "OldPassword123!", name: "Reset User" },
    });

    await request(url, "POST", "/api/auth/forgot-password", { body: { email } });
    const resetEmail = await waitFor(() => findEmail("Reset your password", email));
    const token = tokenFromEmail(resetEmail);

    const reset = await request(url, "POST", "/api/auth/reset-password", {
      body: { token, password: "NewPassword123!" },
    });
    expect(reset.status).toBe(200);

    const oldLogin = await request(url, "POST", "/api/auth/login", {
      body: { email, password: "OldPassword123!" },
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(url, "POST", "/api/auth/login", {
      body: { email, password: "NewPassword123!" },
    });
    expect(newLogin.status).toBe(200);

    const oldRefresh = await request(url, "POST", "/api/auth/refresh", {
      body: { refreshToken: registered.body.data.refreshToken },
    });
    expect(oldRefresh.status).toBe(401);
  });

  test("rejects an invalid reset token", async () => {
    const res = await request(url, "POST", "/api/auth/reset-password", {
      body: { token: "bogus-token", password: "NewPassword123!" },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("password-changed notification email is sent after reset", async () => {
    clearOutbox();
    const email = uniqueEmail("notif");
    await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Notify User" },
    });
    await request(url, "POST", "/api/auth/forgot-password", { body: { email } });
    const resetEmail = await waitFor(() => findEmail("Reset your password", email));
    await request(url, "POST", "/api/auth/reset-password", {
      body: { token: tokenFromEmail(resetEmail), password: "AnotherPass123!" },
    });

    const changed = await waitFor(() => findEmail("Your password was changed", email));
    expect(changed.to).toBe(email);
  });
});

describe("auth: change password", () => {
  test("rejects wrong current password", async () => {
    const email = uniqueEmail("changepw");
    const registered = await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Change User" },
    });

    const res = await request(url, "POST", "/api/auth/change-password", {
      token: registered.body.data.accessToken,
      body: { currentPassword: "WrongPassword1!", newPassword: "NewPassword123!" },
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  test("rejects identical new password", async () => {
    const email = uniqueEmail("samepw");
    const registered = await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Same Password" },
    });
    const res = await request(url, "POST", "/api/auth/change-password", {
      token: registered.body.data.accessToken,
      body: { currentPassword: "Password123!", newPassword: "Password123!" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SAME_PASSWORD");
  });

  test("changes the password and revokes existing refresh tokens", async () => {
    clearOutbox();
    const email = uniqueEmail("changegood");
    const registered = await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Change Good" },
    });

    const res = await request(url, "POST", "/api/auth/change-password", {
      token: registered.body.data.accessToken,
      body: { currentPassword: "Password123!", newPassword: "BrandNew12345!" },
    });
    expect(res.status).toBe(200);

    const oldLogin = await request(url, "POST", "/api/auth/login", {
      body: { email, password: "Password123!" },
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(url, "POST", "/api/auth/login", {
      body: { email, password: "BrandNew12345!" },
    });
    expect(newLogin.status).toBe(200);

    const oldRefresh = await request(url, "POST", "/api/auth/refresh", {
      body: { refreshToken: registered.body.data.refreshToken },
    });
    expect(oldRefresh.status).toBe(401);

    const notification = await waitFor(() => findEmail("Your password was changed", email));
    expect(notification.to).toBe(email);
  });
});

describe("auth: email verification", () => {
  test("verifies the email via the emailed token", async () => {
    clearOutbox();
    const email = uniqueEmail("verify");
    await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Verify User" },
    });

    const verificationEmail = await waitFor(() => findEmail("Verify your email address", email));
    const token = extractToken(verificationEmail.text ?? verificationEmail.html);

    const verify = await request(url, "POST", "/api/auth/verify-email", { body: { token } });
    expect(verify.status).toBe(200);

    const login = await request(url, "POST", "/api/auth/login", {
      body: { email, password: "Password123!" },
    });
    const me = await request(url, "GET", "/api/auth/me", { token: login.body.data.accessToken });
    expect(me.status).toBe(200);
    expect(me.body.data.user.emailVerified).toBe(true);
  });

  test("rejects an invalid verification token", async () => {
    const res = await request(url, "POST", "/api/auth/verify-email", { body: { token: "bogus" } });
    expect(res.status).toBe(401);
  });
});

describe("auth: internal state", () => {
  test("no Better Auth cookie sessions are left behind", async () => {
    const email = uniqueEmail("sessions");
    await request(url, "POST", "/api/auth/register", {
      body: { email, password: "Password123!", name: "Session User" },
    });
    await request(url, "POST", "/api/auth/login", { body: { email, password: "Password123!" } });

    const sessions = await getDB().collection("session").countDocuments({});
    expect(sessions).toBe(0);
  });

  test("passwords are stored hashed, never in plain text", async () => {
    const email = uniqueEmail("stored");
    const password = "PlainTextCheck123!";
    await request(url, "POST", "/api/auth/register", {
      body: { email, password, name: "Stored User" },
    });

    const account = await getDB().collection("account").findOne({ providerId: "credential" });
    expect(account).not.toBeNull();
    expect(account!.password).not.toBe(password);
    expect(String(account!.password)).not.toContain(password);
  });

  test("forgot-password for an unknown address sends no email", async () => {
    clearOutbox();
    await request(url, "POST", "/api/auth/forgot-password", {
      body: { email: uniqueEmail("helper") },
    });
    expect(findEmail("Reset your password")).toBeUndefined();
  });
});
