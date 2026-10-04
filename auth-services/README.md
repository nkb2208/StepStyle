# NgocAnh Auth — Centralized Authentication & Authorization Service

A production-ready auth microservice built with **Node.js + TypeScript + Express + MongoDB + [Better Auth](https://www.better-auth.com)**.

- **RS256 stateless JWTs** — downstream services verify tokens via JWKS, no auth-service call per request
- **Refresh-token rotation** with reuse detection (family revocation)
- **RBAC** — `ADMIN | SELLER | CUSTOMER` roles with wildcard permissions
- **M2M (service-to-service)** — OAuth2-style `client_credentials` grant
- **Better Auth** as the credential authority: scrypt password hashing, password-reset & email-verification tokens
- **Example downstream services** — `product-service` and `order-service` demonstrating stateless verification, RBAC and ownership checks

```
┌────────────┐  register/login/refresh   ┌──────────────────────┐
│   Client   │ ────────────────────────▶ │     Auth Service     │  port 4000
└────────────┘ ◀──── RS256 JWT pair ──── │  Express + Better Auth│
                                          │  MongoDB (auth-db)   │
                                                │  ▲
                 GET /.well-known/jwks.json     │  │ client_credentials
        ┌───────────────────────────────────────┘  └────────────┐
        ▼  (public keys only)                                   │
┌──────────────────┐   Bearer JWT    ┌──────────────────┐        │
│ product-service  │ ◀─────────────  │  order-service   │ ───────┘
│   port 4002      │                 │   port 4003      │ (M2M → product)
│  product-db      │                 │    order-db      │
└──────────────────┘                 └──────────────────┘
```

## Quick start

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- MongoDB (or use Docker below)

### Local (Bun)

```bash
bun install
cp .env.example .env            # then edit values
bun run dev                     # auth service → http://localhost:4000
bun run dev:product             # product service → http://localhost:4002
bun run dev:order               # order service   → http://localhost:4003
```

On first boot the service generates an RSA key pair at `./config/*.key` (git-ignored)
and publishes it at `GET http://localhost:4000/.well-known/jwks.json`.

Optional bootstrap admin (first boot only):

```bash
BOOTSTRAP_ADMIN_EMAIL=admin@example.com BOOTSTRAP_ADMIN_PASSWORD=AdminPass123! bun run dev
```

### Docker Compose

```bash
docker compose up --build
```

Runs `mongodb`, `mailpit` (SMTP UI on http://localhost:8025), `auth`, `product` and `order`.

## Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `bun run dev`        | Auth service (watch mode)                |
| `bun run dev:product`| Product service                          |
| `bun run dev:order`  | Order service                            |
| `bun test`           | Test suite (in-memory MongoDB)           |
| `bun run typecheck`  | `tsc --noEmit` over the whole workspace  |

## API

Full specification: [`openapi/auth-api.openapi.yaml`](./openapi/auth-api.openapi.yaml).

### Authentication (`/api/auth`)

| Method | Path                 | Auth        | Description                                  |
| ------ | -------------------- | ----------- | -------------------------------------------- |
| POST   | `/register`          | public      | Register `CUSTOMER`/`SELLER` → JWT pair      |
| POST   | `/login`             | public      | Email + password → JWT pair                  |
| POST   | `/logout`            | Bearer      | Revoke access `jti` + refresh family         |
| POST   | `/refresh`           | public      | Rotate refresh token (reuse detection)       |
| GET    | `/me`                | Bearer      | Profile: role + permissions                  |
| POST   | `/forgot-password`   | public      | Generic response + reset email               |
| POST   | `/reset-password`    | public      | One-time token → new password                |
| POST   | `/change-password`   | Bearer      | Verify current → set new password            |
| POST   | `/verify-email`      | public      | Verify emailed token                         |
| POST   | `/token`             | public      | `client_credentials` grant (M2M)             |

### Users (`/api/users`) — RBAC protected

| Method | Path          | Required permission | Notes                             |
| ------ | ------------- | ------------------- | --------------------------------- |
| GET    | `/`           | role `ADMIN`        | Paginated list                    |
| POST   | `/`           | `user:create`       | Create with any role (incl. ADMIN)|
| PATCH  | `/:id`        | `user:update`       | Role change revokes refresh tokens|
| DELETE | `/:id`        | `user:delete`       | Cannot delete yourself            |

### Service clients (`/api/services`) — ADMIN only

| Method | Path              | Description                            |
| ------ | ----------------- | -------------------------------------- |
| GET    | `/`               | List clients (no secrets)              |
| POST   | `/`               | Register → `clientSecret` shown **once**|
| DELETE | `/:clientId`      | Revoke a client                        |

### Discovery

| Method | Path                     | Description                     |
| ------ | ------------------------ | ------------------------------- |
| GET    | `/health`                | Health check                    |
| GET    | `/.well-known/jwks.json` | Public keys for JWT verification|

## RBAC model

| Permission        | ADMIN | SELLER | CUSTOMER |
| ----------------- | :---: | :----: | :------: |
| `*:*` (wildcard)  |  ✅   |   —    |    —     |
| `product:read`    |  ✅   |   ✅   |    ✅    |
| `product:create/update/delete` | ✅ | ✅  |    —     |
| `order:create`    |  ✅   |   —    |    ✅    |
| `order:read`      |  ✅   |   ✅   |    ✅    |
| `order:update`    |  ✅   |   ✅   |    —     |
| `user:*`          |  ✅   |   —    |    —     |

Constants live in `packages/auth-types/src/constants.ts` (shared by every service).
Registration only accepts `CUSTOMER`/`SELLER`; `ADMIN` is provisioned via
`POST /api/users` or the bootstrap env vars.

## Token model

**Access token** (RS256, default 15 min) — verified statelessly everywhere:

```json
{
  "sub": "65f1c2...",          // user id (or svc_… for M2M)
  "iss": "auth.yourdomain.com",
  "aud": "api.yourdomain.com",
  "jti": "uuid",
  "type": "user",              // or "service"
  "role": "SELLER",
  "permissions": ["product:*", "order:read", "order:update"],
  "emailVerified": true
}
```

No PII (email/name) is embedded. `iat`/`exp` handled by the JWT library.

**Refresh token** — opaque `rt_…`, stored **SHA-256 hashed** with a family id.
Single use: reuse revokes the whole family. Rotation on every `/refresh`.

**Revocation** — logout writes the access-token `jti` to a TTL denylist consulted
by the auth service itself; downstream services stay stateless (an optional
`checkRevocation` hook exists in `@ngocanh-auth/auth-express`).

## Integrating a downstream service

```ts
import { configureAuth, authenticate, authorizePermission } from "@ngocanh-auth/auth-express";

await configureAuth({
  jwksUrl: "http://auth:4000/.well-known/jwks.json",
  issuer: "auth.yourdomain.com",
  audience: "api.yourdomain.com",
}); // fetches + caches the JWKS at startup (fail-fast)

app.get("/api/products", authenticate(), authorizePermission("product:read"), handler);
```

`authenticate()` verifies signature (`RS256` only), `exp`, `iss`, `aud` and
attaches `req.principal`:

```ts
// user principal
{ type: "user", userId, role, permissions, emailVerified }
// service principal (M2M)
{ type: "service", clientId, permissions }
```

Ownership checks stay in the service (e.g. `product.ownerId === principal.userId`,
with `ADMIN` passing via its `*:*` role).

## Service-to-service (M2M)

```bash
# 1. Admin registers a client (secret returned once)
curl -X POST http://localhost:4000/api/services \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"order-service","scopes":["product:read","order:read"]}'

# 2. Exchange credentials for a token
curl -X POST http://localhost:4000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"svc_…","client_secret":"cs_…"}'

# 3. Call downstream APIs with the service JWT (type: "service", no role)
```

Secrets are hashed with Better Auth's scrypt (`better-auth/crypto`); scope
escalation is rejected (`403 INVALID_SCOPE`); revoked clients get `401 INVALID_CLIENT`.

The `order-service` demonstrates the flow when `PRODUCT_SERVICE_URL`,
`AUTH_SERVICE_URL`, `PRODUCT_SERVICE_CLIENT_ID` and `PRODUCT_SERVICE_CLIENT_SECRET`
are configured — otherwise it runs in local demo mode (price supplied in the request).

## Email flows

`MAIL_TRANSPORT=memory` (or `NODE_ENV=test`) captures mail into an in-memory
outbox instead of sending. In Docker, SMTP points at **Mailpit**
(UI: http://localhost:8025).

- **Verification** — sent on signup (`emailVerification.sendOnSignUp`), link
  `${FRONTEND_URL}/verify-email?token=…`
- **Password reset** — link `${FRONTEND_URL}/reset-password?token=…`, 1-hour TTL,
  single use; all refresh tokens revoked afterwards
- **Password changed** — notification after reset/change

## Configuration

All variables are documented in [`.env.example`](./.env.example). Highlights:

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `PORT` | `4000` | Auth service port |
| `BETTER_AUTH_SECRET` | — | **≥ 32 chars**, required |
| `JWT_ISSUER` / `JWT_AUDIENCE` | `auth.yourdomain.com` / `api.yourdomain.com` | Must match downstream config |
| `ACCESS_TOKEN_EXPIRES_IN` | `15m` | Also exposed as `expiresIn` in responses |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | Refresh family TTL |
| `RATE_LIMIT_ENABLED` | `true` | Tests set `false` |
| `BOOTSTRAP_ADMIN_EMAIL/PASSWORD` | — | First-boot admin only |

## Testing

```bash
bun test          # 82 tests across 4 files
bun run typecheck
```

- `tests/auth-flow.test.ts` — registration, login, `/me`, refresh rotation &
  reuse detection, logout revocation, forgot/reset/change password, email
  verification, hashed storage, no leftover sessions
- `tests/rbac.test.ts` — wildcard evaluation, user-management RBAC,
  role-change revoking refresh tokens, self-delete protection, service-client RBAC
- `tests/downstream.test.ts` — JWKS publication & foreign-key/expired/tampered
  token rejection, product & order RBAC + ownership, full M2M grant flow

The suite boots everything in-process against `mongodb-memory-server`; env is
preloaded via `bunfig.toml` (`tests/helpers/env.ts`).

## Project structure

```
openapi/                  OpenAPI 3.1 specification
docker/                   Multi-stage Dockerfile
packages/
  auth-types/             Shared types, RBAC constants, JwksVerifier
  auth-express/           Downstream authenticate()/authorize* middlewares
services/
  product-service/        Example: stateless verification + ownership
  order-service/          Example: RBAC + M2M call to product-service
src/
  config/                 Env config + runtime assertions
  infrastructure/         database, jwt (RS256/JWKS), email, events, logger
  lib/auth.ts             Better Auth instance (hashing, reset, verify)
  middleware/             authenticate, rate-limit, error-handler
  modules/
    auth/                 register/login/refresh/password flows, M2M grants
    users/                user CRUD + repository (users_extended roles)
    authorization/        RBAC evaluation + route middlewares
  app.ts  server.ts       Express app / bootstrap
tests/                    bun test suites + harness
```

## Security notes

- Passwords hashed by **Better Auth** (scrypt, per-user salt); never logged or returned
- Refresh tokens and M2M secrets stored **hashed** (SHA-256 / scrypt)
- RSA private key excluded from git (`config/*.key`); supply `JWT_PRIVATE_KEY` in production
- Uniform responses hide account existence (login, forgot-password)
- Rate limits on auth endpoints (`RATE_LIMIT_MAX`, per-route stricter limits)
- Helmet, CORS allow-list, body-size limits
- Errors: 4xx messages are safe; 5xx messages are masked in production
