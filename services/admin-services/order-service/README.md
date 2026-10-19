# StepStyle Order Service (FastAPI)

Quản lý đơn hàng cho admin/nhân viên. Bảng dùng chung `stepstyle_db`: `donhang`, `chitietdonhang`, `thanhtoan`.

## Chạy local
```bash
cd services/admin-services/order-service
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env        # DATABASE_URL trỏ MySQL: localhost:3307 nếu dùng docker compose
PYTHONPATH=src uvicorn order.main:app --reload --port 4007   # Windows PowerShell: $env:PYTHONPATH="src"
pytest
```
Swagger: http://localhost:4007/docs

## API (`/api/v1/orders`, cần JWT ADMIN hoặc SELLER)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/orders?page&page_size&status&search&date_from&date_to` | Danh sách + lọc |
| GET | `/orders/stats` | Đếm đơn theo trạng thái |
| GET | `/orders/{id}` | Chi tiết (sản phẩm, thanh toán) |
| PATCH | `/orders/{id}/status` | `{"trang_thai": "PROCESSING"}` |
| PATCH | `/orders/{id}/payment` | `{"trang_thai_thanh_toan": "SUCCESS"}` |

Luồng trạng thái: PENDING → PROCESSING → SHIPPED → DELIVERED; PENDING/PROCESSING → CANCELLED.
