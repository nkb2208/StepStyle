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
