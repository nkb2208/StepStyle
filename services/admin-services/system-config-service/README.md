# System Configuration Service — StepStyle

Admin-only **FastAPI** microservice that owns the *store configuration* of the
StepStyle shoe shop: store information, the payment methods offered to
customers, and the shipping carriers used for delivery.

It maps **three pre-existing MySQL tables** of the shared `stepstyle_db`
schema (`StepStyle-v2.sql`) — no new database, no new tables:

| Table                          | Meaning                                  | Rows                       |
| ------------------------------ | ---------------------------------------- | -------------------------- |
| `caidatcuahang`                | Store settings                           | one (singleton)            |
| `caidatphuongthucthanhtoan`    | Payment-method toggles (MoMo, VNPay, …)  | one per method code        |
| `caidatdoitacvanchuyen`        | Shipping-carrier toggles (GHTK, GHN, …)  | one per carrier code       |

Authentication is stateless: **RS256** access tokens issued by the StepStyle
auth service are verified locally against its **JWKS** endpoint (public keys
only, cached — the auth service is never called per request).

```
                              register / login / refresh
┌──────────┐ ─────────────────────────────────────────────▶ ┌──────────────────┐
│  Admin   │                                                │  Auth service    │
│  panel   │ ◀───────────── RS256 access token ──────────── │  (StepStyle)     │
└────┬─────┘                                                │  port 4000       │
     │ Bearer <JWT>  GET/PUT /api/v1/settings/…             └────────┬─────────┘
     ▼                                                               │ publishes
┌───────────────────────────────┐   GET /.well-known/jwks.json       │ public keys
│  system-config-service :4004  │ ◀──────────────────────────────────┘
│  FastAPI + async SQLAlchemy   │        ┌──────────────────────────────┐
│  verifies signature/exp/aud   │ ─────▶ │ MySQL `stepstyle_db`         │
│  + RBAC (store_setting:*)     │  CRUD  │ caidatcuahang / caidat…      │
└───────────────────────────────┘        └──────────────────────────────┘
```

## API

Base path `/api/v1/settings` · interactive docs at `/docs` · OpenAPI at
`/openapi.json`.

### Response envelope

Success and failure use the same envelope as the rest of the platform:

```json
{ "success": true,  "data": { … } }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Payment method not found" } }
```

### Endpoints

| Method | Path                                      | Permission            | Table                          |
| ------ | ----------------------------------------- | --------------------- | ------------------------------ |
| GET    | `/api/v1/settings/store`                  | `store_setting:read`  | `caidatcuahang`                |
| PUT    | `/api/v1/settings/store`                  | `store_setting:update`| `caidatcuahang`                |
| GET    | `/api/v1/settings/payment-methods`        | `store_setting:read`  | `caidatphuongthucthanhtoan`    |
| PUT    | `/api/v1/settings/payment-methods/{id}`   | `store_setting:update`| `caidatphuongthucthanhtoan`    |
| GET    | `/api/v1/settings/shipping-partners`      | `store_setting:read`  | `caidatdoitacvanchuyen`        |
| PUT    | `/api/v1/settings/shipping-partners/{id}` | `store_setting:update`| `caidatdoitacvanchuyen`        |
| GET    | `/health`                                 | public                | —                              |
| GET    | `/health/ready`                           | public                | DB + JWKS probe                |
| GET    | `/api/v1/me`                              | authenticated         | Echo of the verified principal |

### Store information

`GET /api/v1/settings/store` (also the shape returned by `PUT`):

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
  "created_at": "2026-10-17T13:00:00",
  "updated_at": "2026-10-17T13:05:00"
}
```

`PUT /api/v1/settings/store` is a **partial** update: fields left out keep their
current value. A store singleton is created with the DDL defaults
(`Not configured`, `35000`, `500000`) on the first access, so a database that
only received the tables still answers correctly.

```bash
curl -X PUT http://localhost:4004/api/v1/settings/store \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"store_name":"StepStyle","base_shipping_fee":40000,"free_shipping_threshold":600000}'
```

### Payment methods

`GET /api/v1/settings/payment-methods` → list of
`{ id, code, name, description, enabled }`. The catalog is materialised on first
read (`cod`, `card`, `momo`, `zalopay`, `vnpay`, `bank_transfer`), **all
disabled** — no gateway is integrated yet, so nothing is offered to customers
until an administrator enables it.

`PUT /api/v1/settings/payment-methods/{id}` where `{id}` is
`ma_cai_dat_phuong_thuc`:

```json
{ "enabled": true }
```

Disabling a method flips `kich_hoat` to `0` — **the row is never deleted**, so
the configuration (and its history) survives.

### Shipping partners

`GET /api/v1/settings/shipping-partners` → list of
`{ id, code, name, description, enabled }` (`ghtk`, `ghn`, `jnt`,
`viettelpost`). `PUT /api/v1/settings/shipping-partners/{id}` toggles one
carrier by `ma_cai_dat_doi_tac`, with the same never-delete rule.

## Validation & security

- **Admin only.** Reads require `store_setting:read`, writes require
  `store_setting:update`. `ADMIN` holds the `*:*` wildcard; `SELLER` and
  `CUSTOMER` do not, so they receive `403`. Roles/permissions live in
  `packages/auth-types/src/constants.ts`.
- **No secrets in the payload.** The schemas use `extra="forbid"` — API keys,
  tokens or gateway passwords are rejected with `422` rather than stored.
- **Amounts** are whole non-negative VND integers (`DECIMAL(15,0)`); `-1`,
  `500000.5` and `"35.000"` are all rejected (`422`) before touching the DB.
  The tables also carry `CHECK (… >= 0)` constraints.
- **Store name** must be non-blank; **email** must be valid when present;
  **phone** follows the Vietnamese format (`0xxxxxxxxx` / `+84xxxxxxxxx`,
  whitespace normalised).
- **IDs** are validated (`int`, `>= 1`); an unknown id returns
  `404 PAYMENT_METHOD_NOT_FOUND` / `404 SHIPPING_PARTNER_NOT_FOUND`.
- **Errors never leak internals:** driver/SQL messages and stack traces stay in
  the server log; clients receive a stable code (`INTERNAL_ERROR`, `CONFLICT`,
  …).
- **Transactions:** one transaction per request (`db.get_session`) — commit on
  success, rollback on any exception.

## Run

Requirements: Python ≥ 3.12, MySQL 8+ (or Docker), and the auth service on port
4000 for real tokens.

### Local (pip)

```bash
cd services/admin-services/system-config-service
python -m venv .venv && . .venv/Scripts/activate      # Windows
pip install -r requirements.txt

# 1. Schema (idempotent — safe on an existing stepstyle_db)
mysql -u root -p < StepStyle-v2.sql
#    …or, for a database created before the module existed:
mysql -u root -p stepstyle_db < migrations/001_store_settings.sql

# 2. Configure
cp .env.example .env      # edit DATABASE_URL / JWKS_URL / JWT_ISSUER / JWT_AUDIENCE

# 3. Run
uvicorn systemconfig.main:app --app-dir src --reload --port 4004
```

### Docker (MySQL + API)

```bash
docker compose up --build          # → http://localhost:4004
```

### Sanity checks

```bash
curl http://localhost:4004/health          # {"status":"ok"}
curl http://localhost:4004/health/ready    # database + JWKS reachability
curl http://localhost:4004/api/v1/settings/store   # 401 {"success":false,…}
```

Get a token from the auth service and call an endpoint:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"…"}' | jq -r '.data.accessToken')

curl http://localhost:4004/api/v1/settings/store -H "Authorization: Bearer $TOKEN"
```

## Tests

```bash
pip install -r requirements-dev.txt
pytest                     # unit + integration, no MySQL required
ruff check src tests scripts
python scripts/smoke.py    # end-to-end against a real MySQL + a local JWKS
```

The suite (68 tests) runs the whole HTTP API against a **SQLite** file using
`aiosqlite` (the production driver stays `aiomysql`), so it needs no external
service. It covers: health/discovery, RBAC and JWKS token verification, schema
validation, the store singleton, partial updates, payment-method and
shipping-partner toggles (persistence, never-delete, 404/422 cases) and secret
non-leakage. `scripts/smoke.py` additionally drives the real MySQL database with
a genuinely signed RS256 token.

## Project structure

```
StepStyle-v2.sql            Shared MySQL schema (source of truth)
migrations/                 Incremental SQL for databases created earlier
.env.example                All configuration, documented
Dockerfile                  pip-based image (python:3.13-slim)
docker-compose.yml          MySQL (schema auto-loaded) + the API
scripts/smoke.py            End-to-end smoke test (real MySQL + real JWKS)
pytest.ini                  `pythonpath = src`, no editable install needed
src/systemconfig/
  config.py                 pydantic-settings (env / .env)
  db.py                     async engine, session-per-request, declarative base
  models.py                 ORM mapping of the three `caidat*` tables
  schemas.py                Pydantic request/response schemas
  common.py                 Money helper + success envelope
  errors.py                 Uniform {success:false,error:{…}} handlers
  security/
    jwks.py                 Async JWKS verifier (twin of the auth SDK's)
    rbac.py                 Wildcard permission evaluation
    deps.py                 authenticate / require_permission / require_role
  repositories/
    settings_repository.py  SQL queries for the three tables
  services/
    defaults.py             Default payment-method / shipping-carrier catalog
    settings_service.py     Business rules, serialisation, shipping-fee helper
  routers/settings.py       REST routes (`/api/v1/settings`)
  main.py                   App factory, CORS, envelope middleware, lifespan
tests/                      pytest suite (no database required)
```

## Notes

- All table/column names stay Vietnamese in the database layer; API fields are
  English (`store_name`, `base_shipping_fee`, `enabled`, …).
- Money is `DECIMAL(15,0)` and serialised as integers (VND has no decimals).
- Timestamps are read back with `eager_defaults=True` — lazy loading is not
  available in an async SQLAlchemy session.
- `calculate_shipping_fee(order_value)` is kept on the service for the order
  domain: `order_value >= free_shipping_threshold ? 0 : base_shipping_fee`.

### Not part of this service (integration gaps)

- No real payment gateway or carrier API is called. Enabling a method/carrier
  only exposes the toggle; wiring an actual MoMo/VNPay/carrier integration is a
  separate task and is intentionally **not** simulated here.
- Carrier/gateway credentials (API keys, shop ids) are deliberately not part of
  the settings payload; add dedicated columns (and a secure store) if that
  becomes a requirement.
