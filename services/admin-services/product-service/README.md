# Product Catalog Service — StepStyle

Core **FastAPI** microservice that owns the *product catalog* of the StepStyle shoe shop: categories, products, and their specific variants (sizes, colors, and stock inventory).

It maps **three pre-existing MySQL tables** of the shared `stepstyle\_db` schema — no new database, no new tables:

|Table|Meaning|Relationship|
|-|-|-|
|`danhmuc`|Categories (Sneakers, Accessories, etc.)|Hierarchical (Self-referencing parent/child)|
|`sanpham`|Products (Base information, price, main image)|Belongs to 1 `danhmuc`|
|`bienthesanpham`|Product variants (Size, color, stock limit)|Belongs to 1 `sanpham`|

The service handles CORS specifically for the frontend admin panel (`http://localhost:5173`) and connects synchronously to the database using `pymysql`.

```text
                              CRUD Requests
┌──────────┐ ─────────────────────────────────────────────▶ ┌───────────────────────────────┐
│  Admin   │   GET / POST / PUT / DELETE                    │  product-catalog-service      │
│  panel   │   (e.g., /products/categories)                 │  FastAPI + SQLAlchemy (sync)  │
│  :5173   │ ◀──────────── JSON Responses ───────────────── │  port 8000 (default)          │
└──────────┘                                                └────────┬──────────────────────┘
                                                                     │
                                                                     ▼
                                                        ┌──────────────────────────────┐
                                                        │ MySQL `stepstyle\_db`         │
                                                        │ danhmuc / sanpham / bienthe  │
                                                        └──────────────────────────────┘
```

## API

Base path `/` · interactive docs at `/docs` · OpenAPI at `/openapi.json`.

### Endpoints

|Method|Path|Target|Description|
|-|-|-|-|
|GET|`/products/categories`|Categories|List all categories|
|POST|`/products/categories/create`|Categories|Create a new category|
|PUT|`/products/categories/update/{id}`|Categories|Update category details|
|DELETE|`/products/categories/delete/{id}`|Categories|Delete category (blocked if products exist)|
|GET|`/products`|Products|List all products with their nested variants|
|GET|`/products/find`|Products|Search by name, status, or category ID|
|GET|`/products/{id}`|Products|Get single product details by ID|
|POST|`/products/create`|Products|Create a new base product|
|PUT|`/products/update/{id}`|Products|Update base product details|
|DELETE|`/products/delete/{id}`|Products|Delete product (blocked if variants exist)|
|POST|`/products/variant/create`|Variants|Add a size/color variant to a product|
|PUT|`/products/variant/update/{id}`|Variants|Update variant details \& stock|
|DELETE|`/products/variant/delete/{id}`|Variants|Delete a specific variant|

### System settings (`/api/v1/settings`)

The store configuration owned by `system-config-service` is also exposed here, so
the whole admin API is documented in a single Swagger UI at `http://localhost:4008/docs`.

|Method|Path|Target|Description|
|-|-|-|-|
|GET|`/api/v1/settings/public`|`caidat*`|Public storefront config — enabled options only, no auth|
|GET|`/api/v1/settings/store`|`caidatcuahang`|Read the store configuration|
|PUT|`/api/v1/settings/store`|`caidatcuahang`|Partial update of the store configuration|
|GET|`/api/v1/settings/payment-methods`|`caidatphuongthucthanhtoan`|List payment methods|
|PUT|`/api/v1/settings/payment-methods/{id}`|`caidatphuongthucthanhtoan`|Enable/disable a payment method|
|GET|`/api/v1/settings/shipping-partners`|`caidatdoitacvanchuyen`|List shipping carriers|
|PUT|`/api/v1/settings/shipping-partners/{id}`|`caidatdoitacvanchuyen`|Enable/disable a shipping carrier|

The store singleton, the six payment methods and the four carriers are created
with their defaults (all disabled) on first access. Disabling an option only
flips `kich_hoat`; no row is ever deleted. Every route except `/public` requires
an `ADMIN` bearer token.

### Products \& Variants Structure

`GET /products` returns a list of products. Because of SQLAlchemy relationships, each product includes its nested variants (`danh\_sach\_bien\_the`).

```json
\[
  {
    "ma\_san\_pham": 1,
    "ten\_san\_pham": "Giày Thể Thao StepStyle",
    "gia\_goc": 1500000,
    "gia\_khuyen\_mai": 1200000,
    "hinh\_anh\_dai\_dien": "https://...",
    "trang\_thai": "ACTIVE",
    "ma\_danh\_muc": 2,
    "danh\_sach\_bien\_the": \[
      {
        "ma\_bien\_the": 1,
        "kich\_co": "42",
        "mau\_sac": "Trắng",
        "so\_luong\_kho": 50,
        "hinh\_anh\_bien\_the": "https://..."
      }
    ]
  }
]
```

`POST /products/create` accepts the base product. Variants must be added subsequently via `/products/variant/create`.

```json
{
  "ten\_san\_pham": "Giày Chạy Bộ StepStyle X1",
  "gia\_goc": 2000000,
  "gia\_khuyen\_mai": 2000000,
  "mo\_ta": "Giày chạy bộ chuyên nghiệp...",
  "hinh\_anh\_dai\_dien": "link\_anh\_goc",
  "trang\_thai": "ACTIVE",
  "ma\_danh\_muc": 1
}
```

### Categories

`GET /products/categories` returns a flat list of categories. Note that categories support a self-referencing hierarchy via `ma\_danh\_muc\_cha` (Parent Category ID).

```json
\[
  {
    "ma\_danh\_muc": 1,
    "ten\_danh\_muc": "Sneakers",
    "mo\_ta": "Các dòng giày thể thao",
    "ma\_danh\_muc\_cha": null
  }
]
```

## Validation \& Business Rules

* **Relational Integrity Limits:**

  * **Deleting a product:** Will be rejected (`400 Bad Request`) if the product still has variants attached. Variants must be deleted first.
  * **Deleting a category:** Will be rejected (`400 Bad Request`) if there are products belonging to this category.
* **Search Capabilities:** The `/products/find` endpoint allows dynamic querying. It supports partial, case-insensitive matches for product names (`ilike`), exact matches for status, and exact matches for category ID.
* **Data Types:** Prices are handled as `DECIMAL(15,0)` (mapped to `float` in Pydantic) to support large VND amounts. Timestamps (`ngay\_tao`, `ngay\_cap\_nhat`) are automatically handled by the database engine (`func.now()`).
* **CORS Restricted:** Cross-Origin Resource Sharing is strictly configured to only accept requests from `http://localhost:5173` (the expected Vite/React frontend).

## Run

Requirements: Python 3+ and MySQL 8+ running locally with credentials `root:root` on port `3306`.

### Local Development

```bash
# 1. Install dependencies
pip install fastapi uvicorn sqlalchemy pymysql pydantic

# 2. Ensure MySQL is running and the database exists
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS stepstyle\_db;"

# 3. Run the service
# The metadata.create\_all(bind=engine) in main.py will auto-create tables if missing
uvicorn main:app --reload --port 4008
```

### Sanity checks

```bash
curl http://localhost:4008/products/categories
curl "http://localhost:4008/products/find?product\_name=Giay\&product\_status=ACTIVE"
curl http://localhost:4008/api/v1/settings/public
```

## Project structure

```text
database.py                 SQLAlchemy engine, connection string, and sessionmaker
main.py                     FastAPI app, CORS, Pydantic schemas, and product REST routes
models.py                   SQLAlchemy ORM models (SanPham, DanhMuc, BienTheSanPham, CaiDat*)
security.py                 JWKS verification and the `ADMIN` guard
settings_router.py          System settings routes under `/api/v1/settings`
```

## Notes

* **Language Mapping:** Database tables, columns, and Pydantic schemas are named in Vietnamese (`ma\_san\_pham`, `ten\_danh\_muc`, etc.) to match the legacy database schema design.
* **Synchronous DB calls:** The FastAPI route handlers are defined as `async def`, but the SQLAlchemy engine and queries (`db.query(...)`) are synchronous (`pymysql`). In a high-concurrency production environment, this might block the event loop; consider upgrading to `aiomysql` and `AsyncSession` for non-blocking I/O.
* **Response Format:** Unlike the reference architecture envelope (`{ "success": true, "data": ... }`), this service currently returns raw data arrays, objects, or plain text strings directly to the client. Frontend consumers must parse the data accordingly.

