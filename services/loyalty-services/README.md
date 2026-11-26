# StepStyle Loyalty Service (Service 2)

Quản lý hồ sơ cá nhân, sổ địa chỉ giao hàng, hạng thành viên và luồng mua gói VIP.
Service này **không tự đăng nhập**: nó xác minh JWT RS256 do IAM (Service 1) cấp,
qua JWKS, rồi dùng claim `sub` làm khóa người dùng.

- Ngôn ngữ / framework: Python 3.12+, FastAPI, SQLAlchemy async
- Cơ sở dữ liệu: MySQL `stepstyle_db` (chỉ dùng 6 bảng riêng, không đụng `nguoidung`)
- Cổng: **8002**
- Swagger: http://localhost:8002/docs

## Phụ thuộc vào service khác

| Service | Dùng để làm gì |
|---|---|
| IAM (Service 1) | Lấy khóa công khai (JWKS) để xác minh token; gọi `GET /api/auth/me` lần đầu để lấy email và tên |
| Checkout (Service 4) | Gọi ngược lại service này để lấy % giảm giá VIP |

## Cấu trúc dữ liệu

| Bảng | Nội dung |
|---|---|
| `ho_so_nguoi_dung` | Hồ sơ, 1 dòng / người dùng (khóa `auth_user_id` = `sub`) |
| `dia_chi_giao_hang` | Sổ địa chỉ, tối đa 10 địa chỉ / người, đúng 1 địa chỉ mặc định |
| `hang_thanh_vien` | Danh mục hạng: STANDARD, SILVER, GOLD, PLATINUM |
| `thanh_vien` | Hạng hiện tại, điểm và ngày hết hạn của từng người |
| `goi_vip` | Các gói VIP đang bán |
| `giao_dich_vip` | Lịch sử mua gói (PENDING / SUCCESS / FAILED / CANCELLED) |

Bảng được tạo và nạp dữ liệu mặc định (4 hạng, 3 gói) tự động khi service khởi động.

## Chạy local

```powershell
cd services\loyalty-services
pip install -r requirements.txt
$env:PYTHONPATH = "src"
python -m uvicorn loyalty.main:app --port 8002 --reload
```

Cần MySQL và IAM đang chạy (`docker compose up -d mysql auth` ở thư mục gốc repo)
và file `.env` (xem `.env.example`).

## Chạy bằng Docker

```powershell
docker compose up -d --build loyalty
```

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | - | Chuỗi kết nối MySQL (`mysql+aiomysql://...`) |
| `PORT` | 8002 | Cổng lắng nghe |
| `JWKS_URL` | - | Địa chỉ JWKS của IAM |
| `AUTH_SERVICE_URL` | - | Địa chỉ IAM, dùng để gọi `/api/auth/me` |
| `JWT_ISSUER`, `JWT_AUDIENCE` | `auth.yourdomain.com`, `api.yourdomain.com` | Phải khớp với token của IAM |
| `CORS_ORIGINS` | - | Các origin frontend được phép gọi |
| `VIP_MOCK_PAYMENT` | true | Bật thanh toán giả lập (chỉ dùng demo) |
| `AVATAR_DIR` | uploads/avatars | Thư mục lưu ảnh đại diện |
| `AVATAR_MAX_BYTES` | 2097152 | Dung lượng tối đa của ảnh (2MB) |

## Danh sách API

Tất cả API cần header `Authorization: Bearer <accessToken>`.
Phản hồi dưới `/api/v1` được bọc dạng `{ "success": true, "data": ... }`.

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/v1/users/me` | Xem hồ sơ (tự tạo ở lần gọi đầu) |
| PUT | `/api/v1/users/me` | Cập nhật hồ sơ |
| POST | `/api/v1/users/me/avatar` | Tải ảnh đại diện (JPEG/PNG/WEBP, tối đa 2MB) |
| GET | `/api/v1/users/me/addresses` | Danh sách địa chỉ |
| POST | `/api/v1/users/me/addresses` | Thêm địa chỉ |
| PUT | `/api/v1/users/me/addresses/{id}` | Sửa địa chỉ |
| PUT | `/api/v1/users/me/addresses/{id}/default` | Đặt làm mặc định |
| DELETE | `/api/v1/users/me/addresses/{id}` | Xóa địa chỉ |
| GET | `/api/v1/users/me/membership` | Hạng thành viên hiện tại |
| GET | `/api/v1/vip/packages` | Các gói VIP đang bán |
| POST | `/api/v1/vip/purchase` | Mua gói VIP (tạo giao dịch PENDING) |
| GET | `/api/v1/vip/transactions` | Lịch sử giao dịch |
| POST | `/api/v1/vip/transactions/{ma}/mock-pay` | Giả lập thanh toán thành công |
| GET | `/api/users/{id}/vip-benefits` | **Cho Service 4**, xem bên dưới |

## Hợp đồng với Service 4 (Checkout)

```
GET /api/users/{userId}/vip-benefits
Authorization: Bearer <token của khách>
```

Phản hồi (JSON phẳng, **không** bọc trong `data`):

```json
{
  "user_id": "6b06cea399d218a54b23f958",
  "tier": "GOLD",
  "tier_name": "Vàng",
  "discount_percent": 10,
  "free_shipping": true,
  "expires_at": "2027-02-24T10:00:00"
}
```

Lưu ý: service dùng `sub` trong **token**, bỏ qua `{userId}` trên URL
(frontend hiện gửi ID không đáng tin), nên mỗi người chỉ xem được quyền lợi của chính mình.

## Quy tắc nghiệp vụ

- Hạng hết hạn thì tự coi là STANDARD (tính lúc đọc, không cần tác vụ nền).
- Không cho mua gói thấp hơn hạng đang còn hạn (409). Mua cùng hạng thì gia hạn nối tiếp.
- Giá gói lấy từ DB, không nhận số tiền từ client.
- Kích hoạt giao dịch idempotent: gọi thanh toán nhiều lần chỉ cộng quyền lợi một lần.
- Điểm tích lũy: 1 điểm / 1.000đ của giao dịch thành công.
- Địa chỉ của người khác trả 404 (không lộ sự tồn tại).

## Test

```powershell
python -m pytest -v
```

Test dùng SQLite tạm và giả lập đăng nhập, không cần MySQL hay IAM.