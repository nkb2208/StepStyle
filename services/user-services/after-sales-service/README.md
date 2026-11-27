# StepStyle — After-Sales & Feedback Service (Service 5)

Microservice giải quyết **luồng đổi size / trả hàng và hỗ trợ khách hàng (`EXCHANGE`, `RETURN`, `SUPPORT`)**, đồng thời thu thập **Đánh giá sản phẩm (`Feedback / Reviews`)** sau khi mua hàng và **đẩy ngược dữ liệu đánh giá về `catalog_search_service`** để tối ưu xếp hạng tìm kiếm (Bayesian Ranking).

---

## Công nghệ & tích hợp

- **Framework:** Python 3.13, Django 5.2, Django REST Framework 3.16, Gunicorn, `drf-spectacular` (OpenAPI 3.0 & Swagger UI)
- **Cơ sở dữ liệu:** MySQL 8.4 (`stepstyle_db` trên container `stepstyle-mysql`)
- **Cổng mặc định:** **`8005`**
  - **Swagger UI:** `http://localhost:8005/api/docs/`
  - **OpenAPI Schema:** `http://localhost:8005/api/schema/`
  - **Health check:** `http://localhost:8005/health`
- **Tích hợp liên service:**
  - **Order Service (Service 4):** `GET /api/internal/orders/{orderId}/verify-purchase` *(fail-closed)* — xác minh đúng người mua, trạng thái `DELIVERED`, đúng sản phẩm/biến thể trong đơn.
  - **Catalog & Search Service (Service 3):** `POST /api/v1/internal/products/{id}/metrics` *(best-effort)* — đẩy `newAvgRating` và `reviewCountDelta` (`+1` / `0` / `-1`) sau khi tạo, sửa số sao hoặc xóa đánh giá.

---

## Hướng dẫn khởi chạy

### Cách 1: Chạy bằng Docker Compose ở thư mục gốc `StepStyle` (Khuyến nghị)

Service đã được tích hợp trực tiếp vào `docker-compose.yml` ở thư mục gốc `StepStyle` (kèm tự động nạp `001_after_sales.sql` khi khởi tạo MySQL mới).

- Khởi chạy **toàn bộ hệ thống** (bao gồm `after-sales-service`):
  ```powershell
  docker compose up -d --build
  ```
- Hoặc chỉ build & khởi chạy riêng `after-sales-service` (khi `mysql` và `checkout-service` đã chạy):
  ```powershell
  docker compose up -d --no-deps --build after-sales
  ```
- Nếu database `stepstyle_db` đã tạo từ trước và chưa có 2 bảng `danhgia`, `yeucauhaumai`:
  ```powershell
  cmd /c "docker exec -i stepstyle-mysql mysql -uroot -proot --default-character-set=utf8mb4 stepstyle_db < services\user-services\after-sales-service\migrations\001_after_sales.sql"
  ```

Kiểm tra trạng thái & log:
```powershell
docker compose ps after-sales
docker compose logs -f after-sales
```

Truy cập Swagger UI tại: **`http://localhost:8005/api/docs/`**

---

### Cách 2: Chạy trực tiếp trên máy cục bộ (Local Python)

```powershell
cd services\user-services\after-sales-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python src\manage.py runserver 8005
```

> **Lưu ý `.env`:** `DB_HOST` và `DB_PORT` là 2 biến tách rời (`DB_HOST=127.0.0.1`, `DB_PORT=3307`), không gộp `127.0.0.1:3307` vào `DB_HOST`.

---

## Biến môi trường chính

| Biến | Local (`.env`) | Docker (`docker-compose.yml`) | Mô tả |
| :--- | :--- | :--- | :--- |
| `DEBUG` | `true` | `false` | Chế độ phát triển |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3307` | `mysql` / `3306` | Kết nối MySQL `stepstyle_db` |
| `ORDER_SERVICE_URL` | `http://127.0.0.1:8000` | `http://checkout-service:8000` | Địa chỉ Order Service |
| `CATALOG_SERVICE_URL` | `http://127.0.0.1:8083` | `http://host.docker.internal:8083` | Địa chỉ Catalog & Search Service |
| `CATALOG_SYNC_ENABLED` | `true` | `true` | Bật/tắt đồng bộ metrics sang Catalog |
| `INTERNAL_API_KEY` | *(trống)* | *(trống)* | Khoá bí mật tuỳ chọn cho `X-Internal-Api-Key` |

---

## Danh sách API Endpoints

Hệ thống hỗ trợ 2 vai trò: `CUSTOMER` và `ADMIN`.

### 1. Feedback (Đánh giá sản phẩm) — `/api/v1/reviews`

| Phương thức | Đường dẫn | Quyền / Header | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reviews` | Public | Danh sách đánh giá (lọc `ma_san_pham`, `ma_nguoi_dung`, `ma_don_hang`, `so_sao`) |
| `GET` | `/api/v1/reviews/summary?ma_san_pham={id}` | Public | Thống kê `avg_rating`, `review_count`, phân bổ 1–5 sao |
| `POST` | `/api/v1/reviews` | Chính chủ đơn hàng | Tạo đánh giá (xác minh qua Order Service, tự động đẩy metrics về Catalog Service) |
| `GET` | `/api/v1/reviews/{id}` | Public | Chi tiết 1 đánh giá |
| `PUT` | `/api/v1/reviews/{id}` | **Chỉ chính chủ** (`X-User-Id` / `ma_nguoi_dung`) | Cập nhật `so_sao`, `noi_dung` (đẩy lại `avg_rating` sang Catalog nếu đổi số sao) |
| `DELETE` | `/api/v1/reviews/{id}` | **Chỉ chính chủ** (`X-User-Id` / `ma_nguoi_dung`) | Xóa đánh giá (kể cả `ADMIN` không phải chính chủ cũng không được xóa; đồng bộ `delta = -1` sang Catalog) |

### 2. After-Sales (Yêu cầu hậu mãi & Đổi trả) — `/api/v1/requests`

| Phương thức | Đường dẫn | Quyền / Header | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/requests` | Public | Danh sách yêu cầu (lọc `ma_nguoi_dung`, `ma_don_hang`, `loai_yeu_cau`, `trang_thai`) |
| `POST` | `/api/v1/requests` | Chính chủ đơn hàng | Tạo yêu cầu (`EXCHANGE`/`RETURN` yêu cầu đơn `DELIVERED`; `SUPPORT` yêu cầu đúng chủ đơn) |
| `GET` | `/api/v1/requests/{id}` | Public | Chi tiết 1 yêu cầu hậu mãi |
| `PUT` | `/api/v1/requests/{id}` | `X-User-Id` (chính chủ) hoặc `X-User-Role: ADMIN` | Cập nhật yêu cầu khi đang `PENDING` |
| `POST` | `/api/v1/requests/{id}/cancel` | `X-User-Id` (chính chủ) hoặc `X-User-Role: ADMIN` | Hủy yêu cầu đang `PENDING` → `CANCELLED` |
| `PUT` | `/api/v1/requests/{id}/process` | `X-User-Role: ADMIN` | Admin duyệt / từ chối / hoàn tất theo state machine và ghi phản hồi |
| `DELETE` | `/api/v1/requests/{id}` | `X-User-Id` (chính chủ) hoặc `X-User-Role: ADMIN` | Xóa yêu cầu (chỉ khi `PENDING` hoặc `CANCELLED`) |

Xem lịch sử các quyết định thiết kế tại [`DECISION.md`](./DECISION.md).
