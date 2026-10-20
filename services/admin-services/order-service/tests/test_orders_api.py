P = "/api/v1/orders"


async def test_list_orders(admin):
    r = await admin.get(P)
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["total"] == 2
    first = next(o for o in data["items"] if o["id"] == 1)
    assert first["email_khach"] == "a@x.com"
    assert first["phuong_thuc_thanh_toan"] == "COD"
    assert first["so_san_pham"] == 2
    assert first["tong_thanh_toan"] == 330  # số nguyên, không phải chuỗi


async def test_filter_status_and_search(admin):
    assert (await admin.get(P, params={"status": "shipped"})).json()["data"]["total"] == 1
    assert (await admin.get(P, params={"search": "Trần"})).json()["data"]["total"] == 1
    assert (await admin.get(P, params={"search": "1"})).json()["data"]["total"] >= 1
    assert (await admin.get(P, params={"status": "BAD"})).status_code == 400


async def test_stats(admin):
    d = (await admin.get(f"{P}/stats")).json()["data"]
    assert d == {"pending": 1, "processing": 0, "shipped": 1, "delivered": 0, "cancelled": 0, "total": 2}


async def test_detail(admin):
    d = (await admin.get(f"{P}/1")).json()["data"]
    assert d["items"][0]["thanh_tien"] == 300
    assert d["trang_thai_ke_tiep"] == ["PROCESSING", "CANCELLED"]
    assert (await admin.get(f"{P}/999")).status_code == 404


async def test_status_flow(admin):
    r = await admin.patch(f"{P}/1/status", json={"trang_thai": "processing"})
    assert r.status_code == 200 and r.json()["data"]["trang_thai"] == "PROCESSING"
    # nhảy cóc PROCESSING -> DELIVERED bị chặn
    r = await admin.patch(f"{P}/1/status", json={"trang_thai": "DELIVERED"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "INVALID_TRANSITION"
    # trạng thái không tồn tại
    assert (await admin.patch(f"{P}/1/status", json={"trang_thai": "XYZ"})).status_code == 422
    # trạng thái cuối không đổi được nữa
    await admin.patch(f"{P}/1/status", json={"trang_thai": "CANCELLED"})
    r = await admin.patch(f"{P}/1/status", json={"trang_thai": "PROCESSING"})
    assert r.status_code == 400


async def test_payment_status(admin):
    r = await admin.patch(f"{P}/1/payment", json={"trang_thai_thanh_toan": "success"})
    assert r.status_code == 200
    pay = r.json()["data"]["thanh_toan"][0]
    assert pay["trang_thai"] == "SUCCESS" and pay["ngay_thanh_toan"] is not None
    # đơn 2 chưa có bản ghi thanh toán
    r = await admin.patch(f"{P}/2/payment", json={"trang_thai_thanh_toan": "SUCCESS"})
    assert r.status_code == 404


async def test_customer_forbidden(customer):
    assert (await customer.get(P)).status_code == 403
    assert (await customer.patch(f"{P}/1/status", json={"trang_thai": "PROCESSING"})).status_code == 403


# ── Create ───────────────────────────────────────────────────────────────────

NEW = {
    "ten_nguoi_nhan": "  Khách Mới ",
    "so_dien_thoai_nhan": "0911000111",
    "dia_chi_giao_hang": "1 Lê Lợi",
    "ma_phuong_thuc": 1,
    "phi_van_chuyen": 30,
    "tien_giam_gia": 20,
    "items": [{"ma_bien_the": 1, "so_luong": 2}, {"ma_bien_the": 1, "so_luong": 1}],
}


async def test_create_order(admin):
    r = await admin.post(P, json=NEW)
    assert r.status_code == 201, r.text
    d = r.json()["data"]
    assert d["ten_nguoi_nhan"] == "Khách Mới"          # đã strip
    assert d["trang_thai"] == "PENDING"
    assert len(d["items"]) == 1 and d["items"][0]["so_luong"] == 3  # gộp dòng trùng
    assert d["items"][0]["don_gia"] == 150                          # giá khuyến mãi từ DB
    assert d["tong_tien_hang"] == 450 and d["tong_thanh_toan"] == 450 - 20 + 30
    assert d["thanh_toan"][0]["phuong_thuc"] == "COD" and d["thanh_toan"][0]["so_tien"] == 460
    assert (await admin.get(P)).json()["data"]["total"] == 3


async def test_create_order_validation(admin):
    bad = lambda **kw: {**NEW, **kw}  # noqa: E731
    r = await admin.post(P, json=bad(items=[{"ma_bien_the": 1, "so_luong": 6}]))  # kho chỉ còn 5
    assert r.status_code == 400 and r.json()["error"]["code"] == "OUT_OF_STOCK"
    r = await admin.post(P, json=bad(items=[{"ma_bien_the": 2, "so_luong": 1}]))  # sản phẩm ngừng bán
    assert r.json()["error"]["code"] == "PRODUCT_INACTIVE"
    r = await admin.post(P, json=bad(items=[{"ma_bien_the": 99, "so_luong": 1}]))
    assert r.json()["error"]["code"] == "VARIANT_NOT_FOUND"
    r = await admin.post(P, json=bad(tien_giam_gia=10**6))
    assert r.json()["error"]["code"] == "DISCOUNT_TOO_HIGH"
    r = await admin.post(P, json=bad(ma_phuong_thuc=99))
    assert r.json()["error"]["code"] == "PAYMENT_METHOD_NOT_FOUND"
    r = await admin.post(P, json=bad(ma_nguoi_dung=99))
    assert r.json()["error"]["code"] == "USER_NOT_FOUND"
    assert (await admin.post(P, json=bad(items=[]))).status_code == 422
    assert (await admin.post(P, json=bad(ten_nguoi_nhan="   "))).status_code == 422
    assert (await admin.get(P)).json()["data"]["total"] == 2  # không đơn nào bị tạo dở


async def test_lookup_endpoints(admin):
    v = (await admin.get(f"{P}/variants")).json()["data"]
    assert [x["ma_bien_the"] for x in v] == [1]  # chỉ sản phẩm ACTIVE
    assert v[0]["don_gia"] == 150 and v[0]["so_luong_kho"] == 5
    assert (await admin.get(f"{P}/payment-methods")).json()["data"][0]["ten_phuong_thuc"] == "COD"


# ── Update ───────────────────────────────────────────────────────────────────

async def test_update_order(admin):
    r = await admin.put(f"{P}/1", json={"dia_chi_giao_hang": "Địa chỉ mới", "ghi_chu": None})
    assert r.status_code == 200
    d = r.json()["data"]
    assert d["dia_chi_giao_hang"] == "Địa chỉ mới" and d["ghi_chu"] is None
    assert d["ten_nguoi_nhan"] == "Nguyễn A" and d["tong_thanh_toan"] == 330  # trường khác giữ nguyên
    assert (await admin.put(f"{P}/1", json={})).status_code == 422
    assert (await admin.put(f"{P}/1", json={"ten_nguoi_nhan": ""})).status_code == 422
    assert (await admin.put(f"{P}/999", json={"ghi_chu": "x"})).status_code == 404


async def test_update_locked(admin):
    r = await admin.put(f"{P}/2", json={"ghi_chu": "x"})  # đơn 2 đang SHIPPED
    assert r.status_code == 400 and r.json()["error"]["code"] == "ORDER_LOCKED"


# ── Delete ───────────────────────────────────────────────────────────────────

async def test_delete_only_cancelled(admin):
    r = await admin.delete(f"{P}/1")  # PENDING
    assert r.status_code == 400 and r.json()["error"]["code"] == "ORDER_NOT_DELETABLE"
    await admin.patch(f"{P}/1/status", json={"trang_thai": "CANCELLED"})
    assert (await admin.delete(f"{P}/1")).status_code == 204
    assert (await admin.get(f"{P}/1")).status_code == 404
    assert (await admin.get(P)).json()["data"]["total"] == 1   # chi tiết + thanh toán xóa theo (cascade)
    assert (await admin.delete(f"{P}/1")).status_code == 404


async def test_customer_forbidden_crud(customer):
    assert (await customer.post(P, json=NEW)).status_code == 403
    assert (await customer.put(f"{P}/1", json={"ghi_chu": "x"})).status_code == 403
    assert (await customer.delete(f"{P}/1")).status_code == 403
