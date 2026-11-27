# DECISION LOG — After-Sales & Feedback Service (Service 5)

Tài liệu này ghi nhận chi tiết từng quyết định kiến trúc và chỉnh sửa code trong phạm vi `services/user-services` (`order-services` và `after-sales-service`), kèm lý do, phương án đã cân nhắc và tác động.

---

## DEC-01: Thiết kế API Contract xác minh đơn hàng với `order-services` thay vì truy vấn chéo bảng SQL

- **Phạm vi chỉnh sửa:**
  - `services/user-services/order-services/routes/api.php`
  - `services/user-services/order-services/app/Http/Controllers/OrderController.php` (`verifyPurchase`)
  - `services/user-services/after-sales-service/src/aftersales/clients.py` (`verify_order_purchase`)
- **Vấn đề trước khi sửa:**
  - `after-sales-service` không kiểm tra xem người tạo đánh giá / yêu cầu hậu mãi có thực sự là người đặt đơn hàng và đã mua sản phẩm đó hay không.
  - Dữ liệu thực tế trong `stepstyle_db` cho thấy đã phát sinh bản ghi không hợp lệ (ví dụ: `danhgia #8` có `ma_nguoi_dung=9` đánh giá `ma_don_hang=2` vốn thuộc `ma_nguoi_dung=23`; `yeucauhaumai #2` có `ma_nguoi_dung=1` cho `ma_don_hang=1` của user `23`).
- **Quyết định:**
  - Mở internal API contract read-only phía `order-services`:
    `GET /api/internal/orders/{orderId}/verify-purchase?ma_nguoi_dung={uid}&ma_san_pham={pid}&ma_bien_the={vid}&require_delivered={true|false}`
  - Phía `order-services` tự kiểm tra `donhang`, join `chitietdonhang` với `bienthesanpham` để lấy danh sách `product_ids` và `variant_ids` thực tế trong đơn, rồi trả về JSON contract chuẩn gồm `eligible`, `reason_code`, `message`, `checks`, `order`.
  - Hỗ trợ bảo vệ nội bộ tuỳ chọn qua header `X-Internal-Api-Key` (nếu cấu hình `INTERNAL_API_KEY`) và định danh `X-Internal-Service: after-sales-service`.
  - Áp dụng cơ chế **fail-closed**: nếu `order-services` không kết nối được hoặc timeout, `after-sales-service` trả về `503 Service Unavailable` (`ORDER_SERVICE_UNAVAILABLE`), tuyệt đối không bỏ qua bước xác minh.
- **Lý do & phương án thay thế:**
  - Phương án truy vấn trực tiếp bảng `donhang` / `chitietdonhang` từ `after-sales-service` bị loại bỏ vì vi phạm nguyên tắc đóng gói dữ liệu (Database-per-Service / Domain Ownership) trong kiến trúc SOA/Microservices.
  - Chọn `GET` thay vì `POST` vì thao tác kiểm tra không làm thay đổi trạng thái (read-only, idempotent), đồng nhất với hợp đồng nội bộ của `loyalty-services` (`GET /api/users/{id}/vip-benefits`).

---

## DEC-02: Dùng Python standard library `urllib` cho client gọi Order Service

- **Phạm vi chỉnh sửa:** `services/user-services/after-sales-service/src/aftersales/clients.py`
- **Quyết định:** Sử dụng `urllib.request`, `urllib.parse`, `urllib.error` có sẵn trong Python standard library thay vì cài thêm `requests` hoặc `httpx`.
- **Lý do:**
  - Môi trường `.venv` hiện có của `after-sales-service` chưa cài `requests`/`httpx`. Dùng stdlib giúp service chạy ngay lập tức không cần cài thêm package, dễ mock trong unit test (`unittest.mock.patch`), và kiểm soát rõ timeout + status code.

---

## DEC-03: Sửa lỗi thiếu `ma_nguoi_dung` khi tạo đánh giá & phân biệt điều kiện `DELIVERED` giữa Feedback và After-Sales

- **Phạm vi chỉnh sửa:**
  - `services/user-services/after-sales-service/src/aftersales/serializers.py`
  - `services/user-services/after-sales-service/src/aftersales/views.py`
- **Vấn đề trước khi sửa:**
  - `DanhGiaCreateSerializer` chỉ khai báo `["ma_san_pham", "ma_don_hang", "so_sao", "noi_dung"]`, thiếu `ma_nguoi_dung`, gây lỗi `500 IntegrityError: Column 'ma_nguoi_dung' cannot be null` khi gọi `POST /api/v1/reviews`.
  - `YeuCauHauMaiCreateSerializer` thiếu `ma_bien_the` và `ma_bien_the_moi` nên khách không thể chỉ định đôi giày/size cần đổi hoặc trả.
- **Quyết định:**
  - Bổ sung `ma_nguoi_dung` vào `DanhGiaCreateSerializer` (validate `>= 1`, `so_sao` từ `1..5`, trim `noi_dung`), tự động gán `trang_thai="PENDING"` khi tạo mới.
  - Bổ sung `ma_bien_the` và `ma_bien_the_moi` vào `YeuCauHauMaiCreateSerializer` & `YeuCauHauMaiUpdateSerializer`, kèm validate nghiệp vụ:
    - `ma_bien_the_moi` chỉ hợp lệ khi `loai_yeu_cau == "EXCHANGE"`.
    - Khi đổi hàng (`EXCHANGE`), `ma_bien_the_moi` phải khác `ma_bien_the`.
    - `ly_do` không được chỉ chứa khoảng trắng.
  - Quy tắc trạng thái đơn hàng khi gọi contract:
    - **Đánh giá (`POST /api/v1/reviews`)**: bắt buộc đúng chủ đơn + `DELIVERED` + `ma_san_pham` nằm trong đơn.
    - **Đổi/Trả (`EXCHANGE`, `RETURN`)**: bắt buộc đúng chủ đơn + `DELIVERED` (+ đúng `ma_bien_the` trong đơn nếu truyền).
    - **Hỗ trợ (`SUPPORT`)**: bắt buộc đúng chủ đơn (+ đúng `ma_bien_the` nếu truyền), **không** bắt buộc `DELIVERED` để khách có thể hỏi hỗ trợ trong lúc đơn đang giao/xử lý.

---

## DEC-04: Xử lý triệt để trùng lặp & ràng buộc DB thay vì để văng `500 IntegrityError`

- **Phạm vi chỉnh sửa:** `services/user-services/after-sales-service/src/aftersales/views.py`
- **Vấn đề trước khi sửa:**
  - Bảng `danhgia` có unique constraint `uq_danhgia_donhang_sanpham (ma_don_hang, ma_san_pham)`. Khi tạo đánh giá lần 2, API trả về HTTP `500`.
  - Tạo nhiều yêu cầu hậu mãi `PENDING` trùng nhau không bị chặn; truyền `ma_bien_the_moi` không tồn tại trong DB gây `500 IntegrityError`.
- **Quyết định:**
  - Kiểm tra trùng `(ma_don_hang, ma_san_pham)` trước khi tạo đánh giá -> trả về `409 Conflict` (`REVIEW_ALREADY_EXISTS`).
  - Kiểm tra trùng yêu cầu `PENDING` cùng `(ma_nguoi_dung, ma_don_hang, ma_bien_the, loai_yeu_cau)` -> trả về `409 Conflict` (`DUPLICATE_PENDING_REQUEST`).
  - Bọc thao tác `save()` bắt `django.db.IntegrityError` và trả về JSON lỗi rõ ràng (`400` / `409`).

---

## DEC-05: Hoàn chỉnh toàn bộ CRUD (`PATCH`, bộ lọc `GET`, kiểm tra chính chủ, kiểm duyệt & state machine)

- **Phạm vi chỉnh sửa:**
  - `services/user-services/after-sales-service/src/aftersales/views.py`
  - `services/user-services/after-sales-service/src/aftersales/serializers.py`
- **Vấn đề trước khi sửa:**
  - Thiếu `PATCH` (partial update) trong `http_method_names`.
  - `GET /api/v1/reviews` và `GET /api/v1/requests` không có query filter.
  - Không kiểm tra quyền sở hữu khi `PUT`/`PATCH`/`DELETE` (ai cũng có thể sửa/xóa bản ghi của người khác).
  - Không có endpoint kiểm duyệt đánh giá (`APPROVED`/`HIDDEN`), không có endpoint hủy yêu cầu (`CANCELLED`), không có endpoint nhân viên xử lý yêu cầu (`APPROVED`/`REJECTED`/`COMPLETED` + `phan_hoi_nhan_vien`), và không có endpoint thống kê điểm đánh giá sản phẩm.
- **Quyết định:**
  - Bật đầy đủ `GET`, `POST`, `PUT`, `PATCH`, `DELETE` cho cả `DanhGiaViewSet` và `YeuCauHauMaiViewSet`.
  - Bổ sung bộ lọc query params:
    - `GET /api/v1/reviews`: `ma_san_pham`, `ma_nguoi_dung`, `ma_don_hang`, `trang_thai`, `so_sao`.
    - `GET /api/v1/requests`: `ma_nguoi_dung`, `ma_don_hang`, `loai_yeu_cau`, `trang_thai`.
  - Bổ sung xác minh tác nhân (actor) qua header `X-User-Id` (hoặc query param `ma_nguoi_dung` khi test nhanh trên Swagger UI) và `X-User-Role` (`CUSTOMER` | `STAFF` | `ADMIN`):
    - Khi tạo (`POST`), nếu client có gửi `X-User-Id` thì bắt buộc khớp với `ma_nguoi_dung` trong body.
    - Khi sửa/xóa/hủy (`PUT`/`PATCH`/`DELETE`/`cancel`), khách hàng bắt buộc là chính chủ (`403 Forbidden` nếu sai người hoặc thiếu định danh); `ADMIN`/`STAFF` được phép thao tác quản trị.
  - Áp dụng quy tắc trạng thái nghiệp vụ (state machine):
    - Đánh giá ở trạng thái `HIDDEN` không cho khách hàng tự sửa.
    - Yêu cầu hậu mãi chỉ cho chỉnh sửa/hủy khi đang `PENDING`; nếu cập nhật `loai_yeu_cau` hoặc `ma_bien_the`, gọi lại Order Service API contract để xác minh.
    - Yêu cầu hậu mãi chỉ cho `DELETE` khi ở trạng thái `PENDING` hoặc `CANCELLED` (bảo toàn lịch sử đơn đã `APPROVED`/`REJECTED`/`COMPLETED`).
    - Nhân viên xử lý qua `PATCH /api/v1/requests/{id}/process` tuân thủ state machine: `PENDING -> APPROVED | REJECTED`, `APPROVED -> COMPLETED | REJECTED`; chặn chuyển ngược hoặc chỉnh đơn đã kết thúc.
  - Bổ sung các action chuyên biệt:
    - `PATCH /api/v1/reviews/{id}/status` (kiểm duyệt đánh giá cho `ADMIN`/`STAFF`).
    - `GET /api/v1/reviews/summary?ma_san_pham={id}` (thống kê `avg_rating`, `review_count`, `approved_review_count`, `rating_breakdown` — sẵn sàng cho storefront hoặc đồng bộ sang `catalog_search_service` sau này).
    - `POST /api/v1/requests/{id}/cancel` (khách hàng hủy yêu cầu `PENDING`).
    - `PATCH /api/v1/requests/{id}/process` (nhân viên xử lý & ghi `phan_hoi_nhan_vien`).

---

## DEC-06: Sửa lỗi 404 khi mở trang gốc `/` hoặc `/api/docs` thiếu dấu `/` cuối

- **Phạm vi chỉnh sửa:**
  - `services/user-services/after-sales-service/src/config/settings.py`
  - `services/user-services/after-sales-service/src/config/urls.py`
- **Vấn đề trước khi sửa:**
  - `MIDDLEWARE` không được khai báo trong `settings.py` nên Django không bật `CommonMiddleware` (`APPEND_SLASH`) -> truy cập `/api/docs` (thiếu `/`) bị 404.
  - Trang gốc `/` không có route -> click trực tiếp `http://127.0.0.1:8005/` từ terminal bị 404.
- **Quyết định:**
  - Thêm `django.middleware.common.CommonMiddleware` vào `MIDDLEWARE`.
  - Thêm route `/` redirect sang `/api/docs/` và endpoint `/health`.

---

## DEC-07: Ghi nhận kết quả kiểm tra `catalog_search_service` (Chỉ đọc — không chỉnh sửa code)

- **Phạm vi kiểm tra:** `services/user-services/catalog_search_service` (không sửa bất kỳ file nào).
- **Kết quả kiểm tra:**
  - `catalog_search_service` **đã có thuật toán tối ưu thứ hạng tìm kiếm theo đánh giá** (`RankingService.java` dùng công thức Bayesian Ranking dựa trên `avgRating`, `reviewCount`, `soldCount`; `SearchService.java` mặc định sort theo `metrics.rankingScore DESC`) và đã mở sẵn endpoint nội bộ `POST /api/v1/internal/products/{id}/metrics` (`InternalCatalogController.java`).
  - **Tuy nhiên, `catalog_search_service` CHƯA sử dụng dữ liệu đánh giá thực tế từ `after-sales-service`**:
    1. Không có HTTP client hay message consumer nào trong `catalog_search_service` lấy dữ liệu từ `after-sales-service`.
    2. Bảng `product_metrics` chỉ đang dùng dữ liệu tĩnh nạp từ Flyway seed `V2__seed_data.sql`.
    3. Hai service đang dùng 2 CSDL độc lập khác schema & khác tập ID sản phẩm (`catalog_search_service` dùng PostgreSQL `stepstyle_catalog`, còn `after-sales-service` dùng MySQL `stepstyle_db`).
  - Để chuẩn bị sẵn sàng cho giai đoạn tích hợp về sau mà không đụng vào `catalog_search_service`, `after-sales-service` đã bổ sung sẵn `GET /api/v1/reviews/summary?ma_san_pham={id}` trả về `avg_rating` và `approved_review_count`.

---

## DEC-08: Xây dựng bộ Unit Test độc lập trên SQLite in-memory

- **Phạm vi chỉnh sửa:**
  - `services/user-services/after-sales-service/src/config/test_settings.py`
  - `services/user-services/after-sales-service/src/aftersales/tests.py`
- **Quyết định:**
  - Tạo `config/test_settings.py` dùng SQLite `:memory:` và mock `urllib.request.urlopen` để kiểm thử toàn bộ CRUD, API contract (owner, non-owner, product-not-in-order, order-not-delivered, 404, 503 fail-closed), duplicate handling, moderation và state machine mà không làm bẩn dữ liệu MySQL thật.

---

## DEC-09: Đồng bộ `migrations/` (`001_after_sales.sql`, `seed_test.sql`, `test_data.sql`) với schema `stepstyle_db` hiện tại

- **Phạm vi chỉnh sửa:**
  - `services/user-services/after-sales-service/migrations/001_after_sales.sql`
  - `services/user-services/after-sales-service/migrations/seed_test.sql`
  - `services/user-services/after-sales-service/migrations/test_data.sql`
- **Các lỗi phát hiện khi đối chiếu trực tiếp với `stepstyle_db` (MySQL 8.4):**
  1. `test_data.sql` dùng giá trị `'SHIPPING'` cho `donhang.trang_thai_don_hang`, nhưng ENUM thực tế của bảng `donhang` là `('PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED')` -> gây lỗi `ERROR 1265 Data truncated` khi nạp SQL.
  2. `seed_test.sql` dùng `INSERT INTO nguoidung` không có `INSERT IGNORE` nên khi chạy lại lần 2 bị lỗi `ERROR 1062 Duplicate entry` trên `email`, đồng thời tạo trùng danh mục/sản phẩm/đơn hàng.
  3. `test_data.sql` không idempotent (mỗi lần chạy nhân bản toàn bộ `danhmuc`, `sanpham`, `donhang` và đụng `uq_bienthe`), chưa phủ trạng thái `PROCESSING`, chưa seed dữ liệu mẫu hợp lệ cho `danhgia`/`yeucauhaumai`, và thiếu `SET NAMES utf8mb4;` khiến tiếng Việt có dấu bị lỗi font khi pipe từ PowerShell.
- **Quyết định:**
  - Bổ sung `SET NAMES utf8mb4;` ở đầu cả 3 file SQL.
  - Sửa `'SHIPPING'` -> `'SHIPPED'` và bổ sung thêm đơn `PROCESSING` để phủ trọn 5 trạng thái ENUM của `donhang`, đảm bảo tuân thủ ràng buộc `chk_sp_gia` và `chk_dh_tong`.
  - Chuyển toàn bộ `seed_test.sql` và `test_data.sql` sang **idempotent** (`INSERT IGNORE` + `WHERE NOT EXISTS` gắn nhãn `[SEED_AF_ORDER_*]` / `[SEED_MINIMAL_1]`) để có thể chạy lại bao nhiêu lần cũng không báo lỗi hay nhân bản dữ liệu.
  - Bổ sung dữ liệu mẫu hợp lệ cho `danhgia` và `yeucauhaumai` (đúng chủ đơn & đúng sản phẩm/biến thể) và truy vấn tổng hợp cuối file in ra bảng mapping `(ma_don_hang, ma_nguoi_dung, email, trang_thai_don_hang, ma_san_pham, ma_bien_the)` giúp test trực tiếp trên Swagger UI.

---

## DEC-10: Chuẩn hóa kiểu Unsigned trong `models.py` & tự động xóa `ma_bien_the_moi` khi đổi loại yêu cầu khỏi `EXCHANGE`

- **Phạm vi chỉnh sửa:**
  - `services/user-services/after-sales-service/src/aftersales/models.py`
  - `services/user-services/after-sales-service/src/aftersales/serializers.py`
  - `services/user-services/after-sales-service/src/aftersales/tests.py`
- **Quyết định:**
  - Đổi các trường khóa ngoại/số sao trong `models.py` sang `PositiveIntegerField`, `PositiveBigIntegerField`, `PositiveSmallIntegerField` cho khớp tuyệt đối với kiểu `INT UNSIGNED` / `BIGINT UNSIGNED` / `TINYINT UNSIGNED` trong `stepstyle_db`.
  - Trong `YeuCauHauMaiUpdateSerializer.validate()`, khi khách đổi `loai_yeu_cau` từ `EXCHANGE` sang `RETURN` hoặc `SUPPORT` mà không gửi kèm `ma_bien_the_moi`, tự động reset `ma_bien_the_moi = None` thay vì báo lỗi validation không cần thiết (vẫn báo lỗi `400` nếu client cố tình gửi `ma_bien_the_moi` khác `null` cho `RETURN`/`SUPPORT`).

---

## DEC-11: Loại bỏ hoàn toàn vai trò `STAFF` khỏi `after-sales-service`

- **Phạm vi chỉnh sửa:** `views.py`, `serializers.py`, `tests.py`, `settings.py`, `README.md`
- **Lý do:** Hệ thống StepStyle chỉ vận hành 2 nhóm tài khoản chính là `CUSTOMER` và `ADMIN` (không có tài khoản `STAFF`).
- **Quyết định:**
  - Chỉ chấp nhận `X-User-Role` thuộc `{"CUSTOMER", "ADMIN"}` (truyền `STAFF` sẽ trả `400 Bad Request`).
  - Thay `_assert_staff` / `_assert_owner_or_staff` thành `_assert_admin` / `_assert_owner_or_admin`; đổi toàn bộ mô tả Swagger UI sang `ADMIN`.
  - Giữ nguyên tên cột vật lý `yeucauhaumai.phan_hoi_nhan_vien` trong MySQL để không phá vỡ schema bảng `yeucauhaumai`, chỉ cập nhật mô tả hiển thị trên API thành *"Phản hồi từ Admin khi xử lý yêu cầu"*.

---

## DEC-12: Loại bỏ `PATCH /api/v1/reviews/{id}` và `PATCH /api/v1/requests/{id}`, chuẩn hóa về `PUT`

- **Phạm vi chỉnh sửa:** `views.py`, `tests.py`, `README.md`
- **Lý do & đánh giá kỹ thuật:**
  - Đồng tình với đề xuất chỉ giữ `PUT`:
    - Với `DanhGia`, số trường cho phép sửa chỉ có 2 trường (`so_sao`, `noi_dung`). Form chỉnh sửa luôn gửi đồng thời cả 2 giá trị, nên có thêm `PATCH` gây trùng lặp giao diện Swagger UI mà không mang lại lợi ích thực tế.
    - Với `YeuCauHauMai`, các trường khách sửa khi `PENDING` cũng nhỏ gọn (`loai_yeu_cau`, `ly_do`, `ma_bien_the`, `ma_bien_the_moi`), dùng `PUT` là đủ và đồng nhất.
  - Vì `ViewSet.http_method_names` bỏ `"patch"`, action xử lý của Admin cũng được chuyển đồng bộ từ `PATCH` sang `PUT /api/v1/requests/{id}/process` (đồng nhất với quy ước `PUT /orders/{id}/status` của `order-services`).

---

## DEC-13: Siết chặt quyền `DELETE` & `PUT` đánh giá — chỉ duy nhất chính chủ được thực hiện

- **Phạm vi chỉnh sửa:** `views.py`, `tests.py`, `README.md`
- **Quyết định:**
  - Tạo hàm `_assert_owner_only(request, instance.ma_nguoi_dung)` áp dụng cho cả `DELETE /api/v1/reviews/{id}` và `PUT /api/v1/reviews/{id}`.
  - Mọi tài khoản khác — **kể cả `X-User-Role: ADMIN`** — đều bị từ chối với `403 Forbidden` nếu không khớp `ma_nguoi_dung` của người đã viết đánh giá, đảm bảo tính khách quan của dữ liệu đánh giá sản phẩm.

---

## DEC-14: Loại bỏ hoàn toàn cột `trang_thai` khỏi bảng `danhgia` và toàn bộ luồng kiểm duyệt đánh giá

- **Phạm vi chỉnh sửa:**
  - `migrations/001_after_sales.sql` (bỏ cột `trang_thai`, đổi `idx_danhgia_sp_tt` thành `idx_danhgia_sanpham (ma_san_pham)`)
  - `migrations/002_drop_danhgia_trang_thai.sql` (migration idempotent áp dụng lên DB hiện có để xóa index cũ + cột `trang_thai` an toàn)
  - `migrations/test_data.sql` (bỏ cột `trang_thai` khi seed bảng `danhgia`)
  - `src/aftersales/models.py`, `serializers.py`, `views.py`, `config/settings.py`, `tests.py`, `README.md`
- **Quyết định:**
  - Vì mọi đánh giá đều đã được xác minh mua hàng hợp lệ qua Order Service (`DELIVERED` + đúng chủ đơn + đúng sản phẩm), loại bỏ quy trình duyệt trạng thái (`PENDING`/`APPROVED`/`HIDDEN`) giúp đơn giản hóa nghiệp vụ và dữ liệu.
  - Xóa endpoint `PATCH /api/v1/reviews/{id}/status`, xóa `DanhGiaStatusUpdateSerializer`, xóa bộ lọc `?trang_thai=` trên `GET /api/v1/reviews`, và cập nhật `GET /api/v1/reviews/summary` tính điểm trung bình & tổng số đánh giá trên toàn bộ bảng `danhgia` của sản phẩm đó.

---

## DEC-15: Tích hợp đẩy ngược dữ liệu đánh giá sang `catalog_search_service` theo cơ chế best-effort

- **Phạm vi chỉnh sửa:**
  - `src/config/settings.py`, `.env`, `.env.example` (thêm `CATALOG_SERVICE_URL`, `CATALOG_SERVICE_TIMEOUT`, `CATALOG_SYNC_ENABLED`)
  - `src/aftersales/clients.py` (`sync_product_review_metrics`)
  - `src/aftersales/views.py` (`DanhGiaViewSet._push_catalog_metrics`)
- **Quyết định:**
  - Sau khi thao tác ghi/xóa trên `danhgia` hoàn tất, tính lại điểm trung bình thực tế của `ma_san_pham` và gọi đúng internal API có sẵn của `catalog_search_service`:
    `POST {CATALOG_SERVICE_URL}/api/v1/internal/products/{ma_san_pham}/metrics` với payload `{"newAvgRating", "reviewCountDelta", "soldCountDelta": 0}`:
    - Tạo đánh giá (`POST`): `reviewCountDelta = +1`
    - Sửa đánh giá (`PUT`, chỉ gọi khi `so_sao` thay đổi): `reviewCountDelta = 0`
    - Xóa đánh giá (`DELETE`): `reviewCountDelta = -1`
  - Áp dụng **best-effort** (ghi log warning nếu Catalog Service tắt/timeout/404, không chặn thao tác đánh giá của khách hàng), không chỉnh sửa bất kỳ file nào trong `catalog_search_service`.

---

## DEC-16: Đóng gói Docker (Gunicorn), tích hợp vào `docker-compose.yml` gốc & dọn sạch các file test / migration tạm

- **Phạm vi chỉnh sửa:**
  - Thêm `src/config/wsgi.py`, `Dockerfile`, `.dockerignore` và `gunicorn>=22.0` vào `requirements.txt`.
  - Tích hợp service `after-sales` (cổng `8005`, phụ thuộc `mysql` healthy và `checkout-service`) cùng mount `migrations/001_after_sales.sql` → `/docker-entrypoint-initdb.d/zz-after-sales.sql` (chạy sau `stepstyle-v2.sql` khi khởi tạo DB mới) vào `docker-compose.yml` ở thư mục gốc `StepStyle`.
  - Sau khi hoàn tất toàn bộ 17 unit test và live E2E test, xóa các file không cần thiết cho bản triển khai:
    - `src/aftersales/tests.py`
    - `src/config/test_settings.py`
    - `migrations/002_drop_danhgia_trang_thai.sql` (đã áp dụng xong lên DB, schema sạch đã nằm trong `001_after_sales.sql`)
    - `migrations/seed_test.sql`, `migrations/test_data.sql`



