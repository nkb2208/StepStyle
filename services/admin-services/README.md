# AdminFeat — StepStyle Admin Microservice

A FastAPI microservice that exposes **admin CRUD** for the StepStyle shop
(`stepstyle_db`, schema in [`StepStyle-v2.sql`](./StepStyle-v2.sql)) and
authenticates every request with the **StepStyle auth microservice**
([`StepStyle/`](./StepStyle)) — stateless RS256 JWTs verified against its JWKS
endpoint, no per-request call to the auth service.

```
                                register / login / refresh
┌──────────┐ ─────────────────────────────────────────────▶ ┌──────────────────┐
│  Admin   │                                                │  Auth service    │
│  panel   │ ◀───────────── RS256 access token ──────────── │  (StepStyle)     │
└────┬─────┘                                                │  port 4000       │
     │ Bearer <JWT>                                         └────────┬─────────┘
     ▼                                                               │ publishes
┌───────────────────────────┐   GET /.well-known/jwks.json           │ public keys
│  admin-service  :4004     │ ◀───────────────────────────────────────┘
│  FastAPI + SQLAlchemy     │
│  verifies signature,      │        ┌────────────────────────────┐
│  exp, iss, aud + RBAC     │ ─────▶ │ MySQL `stepstyle_db`       │
└───────────────────────────┘  CRUD  │ StepStyle-v2.sql           │
                                     └────────────────────────────┘
```

## Quick start

### Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python 3.13 is provisioned automatically)
- MySQL 8+ — or Docker
- The auth service running on port 4000 (for real tokens)

### 1. Database

```bash
# Option A: local MySQL
mysql -u root -p < StepStyle-v2.sql

# Option B: Docker (schema is mounted into /docker-entrypoint-initdb.d)
docker compose up -d db

# Existing database (incremental, idempotent, touches no existing row):
mysql -u root -p stepstyle_db < migrations/001_store_settings.sql
```

### 2. Configure

```bash
cp .env.example .env      # then edit DATABASE_URL / JWKS_URL / JWT_ISSUER / JWT_AUDIENCE
```

`JWT_ISSUER` and `JWT_AUDIENCE` **must match** the auth service's
`JWT_ISSUER` / `JWT_AUDIENCE`, otherwise every token is rejected as invalid.

### 3. Run

```bash
uv run adminfeat                 # → http://localhost:4004  (uvicorn, reload in dev)
uv run uvicorn adminfeat.main:app --reload --port 4004
```

Sanity checks:

```bash
curl http://localhost:4004/health            # {"status":"ok"}
curl http://localhost:4004/health/ready      # database + JWKS reachability
curl http://localhost:4004/api/admin/products# 401 {"success":false,"error":{…}}
```

Docker (MySQL + API in one go):

```bash
docker compose up --build
```

## Authentication

The service never stores sessions. It downloads the auth service's **public
keys** once (cached, refreshed every `JWKS_REFRESH_SECONDS`) and verifies each
bearer token locally:

- algorithm `RS256` only · `exp` / `iat` / `sub` required
- `iss` == `JWT_ISSUER`, `aud` == `JWT_AUDIENCE`, 5 s clock tolerance
- unknown `kid` → force a JWKS refresh (auth service key rotation)
- JWKS unreachable → `503 SERVICE_UNAVAILABLE` (never a silent pass)

Get a token from the auth service, then call the admin API:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"…"}' | jq -r '.data.accessToken')

curl http://localhost:4004/api/admin/orders \
  -H "Authorization: Bearer $TOKEN"
```

An **ADMIN** account is required for most endpoints: the auth service grants
`*:*` to the `ADMIN` role, which satisfies every permission below. Bootstrapping
the first admin is done in the auth service
(`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`).

Service-to-service calls work too: exchange `client_credentials` at
`POST /api/auth/token` and use the resulting M2M token (it carries
`permissions`, no `role`).

### Permission model

Each route declares a `<resource>:<action>` permission and the wildcard
semantics of the auth service are re-implemented in
`src/adminfeat/security/rbac.py` (`*:*`, `product:*`, exact match).

| Resource        | Read             | Create                | Update                | Delete                |
| --------------- | ---------------- | --------------------- | --------------------- | --------------------- |
| `category:*`    | `category:read`  | `category:create`     | `category:update`     | `category:delete`     |
| `product:*`     | `product:read`   | `product:create`      | `product:update`      | `product:delete`      |
| variants        | `product:read`   | `product:create`      | `product:update`      | `product:delete`      |
| `discount:*`    | `discount:read`  | `discount:create`     | `discount:update`     | `discount:delete`     |
| `payment_method:*` | `payment_method:read` | `payment_method:create` | `payment_method:update` | `payment_method:delete` |
| `store_setting:*` | `store_setting:read` | — | `store_setting:update` | — |
| `order:*`       | `order:read`     | `order:create`        | `order:update`        | `order:delete`        |
| `payment:*`     | `payment:read`   | `payment:create`      | `payment:update`      | `payment:delete`      |
| `user:*`        | `user:read`      | `user:create`         | `user:update`         | `user:delete`         |
| dashboard       | `dashboard:read` | —                     | —                     | —                     |

Role → permission mapping lives in the auth service
(`packages/auth-types/src/constants.ts`): `ADMIN → *:*`,
`SELLER → product:*, order:read, order:update`,
`CUSTOMER → product:read, order:create, order:read`.

## API

Base path `/api/admin` · interactive docs at `/docs` · OpenAPI at `/openapi.json`.

### Response envelope

Success:

```json
{ "success": true, "data": { "items": [ … ], "meta": { "page": 1, "page_size": 20, "total": 42, "pages": 3 } } }
```

Failure (identical shape to the auth service):

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Product not found" } }
```

### Endpoints

| Method | Path                                  | Permission          | Notes |
| ------ | ------------------------------------- | ------------------- | ----- |
| GET    | `/api/admin/me`                       | authenticated       | Echo of the verified principal |
| GET    | `/api/admin/dashboard/stats`          | `dashboard:read`    | Totals, orders by status, revenue, low stock, recent orders |
| GET    | `/api/admin/categories`               | `category:read`     | Filters: `parent_id`, `root_only`, `q` |
| POST   | `/api/admin/categories`               | `category:create`   | |
| GET    | `/api/admin/categories/{id}`          | `category:read`     | + product/child counts |
| PATCH  | `/api/admin/categories/{id}`          | `category:update`   | Rejects self-parenting and cycles |
| DELETE | `/api/admin/categories/{id}`          | `category:delete`   | Children/products follow `ON DELETE SET NULL` |
| GET    | `/api/admin/products`                 | `product:read`      | `category_id`, `status`, `q`, `min_price`, `max_price`, `sort`, paging |
| POST   | `/api/admin/products`                 | `product:create`    | `sale_price ≤ original_price` enforced |
| GET    | `/api/admin/products/{id}`            | `product:read`      | Includes variants (`include_variants=false` to skip) |
| PATCH  | `/api/admin/products/{id}`            | `product:update`    | |
| DELETE | `/api/admin/products/{id}`            | `product:delete`    | `409` when a variant appears in an order |
| GET    | `/api/admin/products/{id}/variants`   | `product:read`      | |
| POST   | `/api/admin/products/{id}/variants`   | `product:create`    | `409 DUPLICATE_VARIANT` on same size+color |
| GET    | `/api/admin/variants`                 | `product:read`      | `product_id`, `low_stock`, `max_stock`, `q` |
| GET/PATCH/DELETE | `/api/admin/variants/{id}`  | `product:*`         | `409` if referenced by an order |
| GET    | `/api/admin/discounts`                | `discount:read`     | `active`, `q`, `available` |
| POST   | `/api/admin/discounts`                | `discount:create`   | Code normalised to upper case |
| GET/PATCH/DELETE | `/api/admin/discounts/{id}`   | `discount:*`        | `quantity ≥ used_quantity` enforced |
| GET    | `/api/admin/payment-methods`          | `payment_method:read` | |
| POST   | `/api/admin/payment-methods`          | `payment_method:create` | |
| GET/PATCH/DELETE | `/api/admin/payment-methods/{id}` | `payment_method:*` | |
| GET    | `/api/admin/store/settings`          | `store_setting:read` | Store info, structured warehouse address, payment methods, shipping fees, carriers |
| PATCH  | `/api/admin/store/settings`          | `store_setting:update` | Partial update; unknown codes/fields → `422` |
| GET    | `/api/admin/orders`                   | `order:read`        | `status`, `customer_id`, `discount_id`, `from_date`, `to_date`, `min_total`, `sort` |
| POST   | `/api/admin/orders`                   | `order:create`      | Prices snapshot, stock decrement, discount usage +1; `shipping_fee` omitted → derived from the store settings |
| GET    | `/api/admin/orders/{id}`              | `order:read`        | Order + items + payments |
| PATCH  | `/api/admin/orders/{id}`              | `order:update`      | Recipient/phone/address/note/shipping fee (total recomputed) |
| PATCH  | `/api/admin/orders/{id}/status`       | `order:update`      | State machine, see below |
| DELETE | `/api/admin/orders/{id}`              | `order:delete`      | |
| GET    | `/api/admin/payments`                 | `payment:read`      | `order_id`, `method_id`, `status` |
| POST   | `/api/admin/payments`                 | `payment:create`    | Unique `(method, gateway_txn_id)` |
| GET/PATCH/DELETE | `/api/admin/payments/{id}`    | `payment:*`         | `paid_at` set when the payment settles |
| GET    | `/api/admin/users`                    | `user:read`         | `role`, `active`, `q` (name/email/phone) |
| POST   | `/api/admin/users`                    | `user:create`       | bcrypt hash, never returned |
| GET/PATCH/DELETE | `/api/admin/users/{id}`       | `user:*`            | Self-delete is rejected |
| POST   | `/api/admin/users/{id}/password`      | `user:update`       | Admin password reset |

### Store settings payload

`GET/PATCH /api/admin/store/settings` share one object (the PATCH body is
partial: anything left out keeps its current value):

```json
{
  "store_name": "StepStyle",
  "contact_email": "contact@stepstyle.vn",
  "phone": "0901234567",
  "warehouse_address": {
    "detail": "12 Nguyen Hue",
    "ward": "Ben Nghe",
    "district": "Quan 1",
    "province": "Ho Chi Minh"
  },
  "base_shipping_fee": 35000,
  "free_shipping_threshold": 500000,
  "payment_methods": [
    {"code": "cod", "name": "COD", "description": "Cash on delivery", "enabled": true}
  ],
  "shipping_partners": [
    {"code": "ghtk", "name": "GHTK", "description": "Giao Hàng Tiết Kiệm", "enabled": false}
  ],
  "created_at": "2026-10-05T13:00:00",
  "updated_at": "2026-10-05T13:00:00"
}
```

`payment_methods` / `shipping_partners` are toggles keyed by a **stable code**
(`cod`, `card`, `momo`, `zalopay`, `vnpay`, `bank_transfer` / `ghtk`, `ghn`,
`jnt`, `viettelpost`); on PATCH they are merged by code, so a payload may carry
just the entries it wants to change. Money is always an integer VND amount
(`35000`, never `"35.000"`), and the columns are `DECIMAL(15, 0)`.

## Business rules enforced by this service

These mirror the `CHECK` constraints of `StepStyle-v2.sql` so the API returns a
useful `400/422` instead of a raw database error:

- **Products** — `gia_goc ≥ 0`, `gia_khuyen_mai ≤ gia_goc`, category must exist
- **Variants** — `stock ≥ 0`, unique `(product, size, color)`
- **Discounts** — `PERCENT ≤ 100`, `end_date > start_date`, `quantity ≥ used_quantity`,
  code uniqueness (case-insensitive)
- **Orders** — `total = subtotal − discount + shipping` (`chk_dh_tong`), discount
  window / minimum / remaining-uses validated, stock reserved atomically,
  `409 INSUFFICIENT_STOCK` when a variant runs out
- **Order state machine** — `PENDING → PROCESSING → SHIPPED → DELIVERED`,
  `PENDING/PROCESSING → CANCELLED`; cancelling restores stock and frees the
  discount use; any other jump is `400 INVALID_TRANSITION`
- **Payments** — unique gateway transaction, `paid_at` maintained on settlement
- **Categories** — self-parenting and hierarchy cycles rejected (`400 CYCLIC_CATEGORY`)
- **Store settings** — non-blank `store_name`, valid `contact_email` when set,
  Vietnamese `phone` format (`0xxxxxxxxx` / `+84xxxxxxxxx`, whitespace is the
  only thing normalised), whole-VND `base_shipping_fee` and
  `free_shipping_threshold` `≥ 0` with **no** ordering constraint between them,
  payment methods / carriers restricted to their whitelisted codes, unknown
  fields rejected — integration secrets never belong in this payload
- **Orders** — `shipping_fee` omitted → `base_shipping_fee`, or `0` once the
  order value (subtotal − discount) reaches `free_shipping_threshold`; an
  explicit `shipping_fee` is still honoured verbatim

`nguoidung` rows are the *shop's* user records managed by the admin panel; API
access itself is always decided by the token issued by the auth service.

## Tests

```bash
uv run pytest                        # 53 unit tests: RBAC, schemas, auth, JWKS, store settings
uv run python scripts/smoke.py       # end-to-end: real MySQL + real JWKS round-trip
uv run ruff check src tests scripts  # lint
```

`scripts/smoke.py` spins up a throwaway RSA key pair, serves it as a JWKS
document, signs an admin access token and drives the whole API against MySQL:
category trees, products/variants, discounts, users, order totals, stock
movements, the order state machine, payments, store settings (validation, RBAC
and the shipping-fee integration), referential integrity, the dashboard and
RBAC. It only touches rows it created and cleans them up.

## Project structure

```
StepStyle-v2.sql            Shared MySQL schema (source of truth)
migrations/                 Incremental SQL for databases created earlier
.env.example                All configuration, documented
Dockerfile                  Multi-stage image (uv → python:3.13-slim)
docker-compose.yml          MySQL (schema auto-loaded) + admin API
scripts/smoke.py            End-to-end smoke test
src/adminfeat/
  config.py                 pydantic-settings (env / .env)
  db.py                     async engine, session-per-request, declarative base
  models.py                 ORM mapping of all 14 tables (Vietnamese names kept)
  schemas.py                Pydantic request schemas (English API names)
  common.py                 Pagination, money, envelopes
  errors.py                 Uniform {success:false,error:{code,message}} handlers
  security/
    jwks.py                 Async JWKS verifier (twin of the auth SDK's JwksVerifier)
    rbac.py                 Wildcard permission evaluation
    deps.py                 authenticate / require_permission / require_role
  routers/                  categories, products, variants, discounts,
                            payment-methods, store, orders, payments, users, dashboard
  main.py                   App factory, CORS, envelope middleware, lifespan
tests/                      pytest suite (no database required)
```

## Notes

- All table/column names stay Vietnamese in the database layer; API fields are
  English (`name`, `original_price`, `sale_price`, …).
- Timestamps are read back with `eager_defaults=True` — lazy loading is not
  available in an async SQLAlchemy session.
- Money is `DECIMAL(15,0)` and serialised as integers (VND has no decimals).
- `CORS_ORIGINS` is a comma-separated allow-list; set `JWKS_FAIL_FAST=true` in
  production so a misconfigured auth URL fails at boot.
