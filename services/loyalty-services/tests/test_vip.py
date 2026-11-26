"""Test hạng thành viên và luồng mua gói VIP."""

from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

PACKAGES = "/api/v1/vip/packages"
PURCHASE = "/api/v1/vip/purchase"
TXNS = "/api/v1/vip/transactions"
MEMBERSHIP = "/api/v1/users/me/membership"
DB_FILE = Path(__file__).resolve().parent / ".tmp" / "test.db"


def _package_id(client, ma_hang: str) -> int:
    for p in client.get(PACKAGES).json():
        if p["ma_hang"] == ma_hang:
            return p["id"]
    raise AssertionError(f"Không thấy gói {ma_hang}")


def _buy_and_pay(client, ma_hang: str) -> dict:
    txn = client.post(PURCHASE, json={"goi_id": _package_id(client, ma_hang)}).json()
    r = client.post(f"{TXNS}/{txn['ma_giao_dich']}/mock-pay")
    assert r.status_code == 200
    return r.json()


def _expire_membership(sub: str) -> None:
    """Đẩy ngày hết hạn về quá khứ bằng cách sửa thẳng file SQLite của test."""
    conn = sqlite3.connect(DB_FILE)
    try:
        conn.execute(
            "UPDATE thanh_vien SET ngay_het_han = '2000-01-01 00:00:00.000000' "
            "WHERE auth_user_id = ?",
            (sub,),
        )
        conn.commit()
    finally:
        conn.close()


def test_default_membership_is_standard(client, login_as):
    login_as("u-vip-default")
    body = client.get(MEMBERSHIP).json()
    assert body["ma_hang"] == "STANDARD"
    assert body["phan_tram_giam"] == 0
    assert body["con_han"] is True


def test_packages_are_seeded(client, login_as):
    login_as("u-vip-pkg")
    packages = client.get(PACKAGES).json()
    assert len(packages) == 3
    assert {p["ma_hang"] for p in packages} == {"SILVER", "GOLD", "PLATINUM"}


def test_purchase_creates_pending_with_price_from_db(client, login_as):
    login_as("u-vip-buy")
    gold = _package_id(client, "GOLD")
    # Client cố gửi thêm số tiền: phải bị bỏ qua, giá lấy từ DB
    r = client.post(PURCHASE, json={"goi_id": gold, "so_tien": 1})
    assert r.status_code == 201
    body = r.json()
    assert body["trang_thai"] == "PENDING"
    assert body["so_tien"] == 249000


def test_pay_upgrades_tier_and_gives_points(client, login_as):
    login_as("u-vip-pay")
    txn = _buy_and_pay(client, "GOLD")
    assert txn["trang_thai"] == "SUCCESS"
    assert txn["ngay_thanh_toan"] is not None

    m = client.get(MEMBERSHIP).json()
    assert m["ma_hang"] == "GOLD"
    assert m["phan_tram_giam"] == 10
    assert m["mien_phi_van_chuyen"] is True
    assert m["tong_diem"] == 249
    assert m["con_han"] is True


def test_paying_twice_is_idempotent(client, login_as):
    login_as("u-vip-idem")
    txn = _buy_and_pay(client, "GOLD")
    before = client.get(MEMBERSHIP).json()

    again = client.post(f"{TXNS}/{txn['ma_giao_dich']}/mock-pay")
    assert again.status_code == 200
    assert again.json()["trang_thai"] == "SUCCESS"

    after = client.get(MEMBERSHIP).json()
    assert after["tong_diem"] == before["tong_diem"] == 249  # không cộng điểm lần 2
    assert after["ngay_het_han"] == before["ngay_het_han"]  # không gia hạn lần 2


def test_cannot_buy_lower_tier_while_higher_active(client, login_as):
    login_as("u-vip-lower")
    _buy_and_pay(client, "GOLD")
    r = client.post(PURCHASE, json={"goi_id": _package_id(client, "SILVER")})
    assert r.status_code == 409


def test_upgrade_to_higher_tier(client, login_as):
    login_as("u-vip-up")
    _buy_and_pay(client, "SILVER")
    assert client.get(MEMBERSHIP).json()["ma_hang"] == "SILVER"
    _buy_and_pay(client, "GOLD")
    assert client.get(MEMBERSHIP).json()["ma_hang"] == "GOLD"


def test_same_tier_extends_expiry(client, login_as):
    login_as("u-vip-extend")
    _buy_and_pay(client, "SILVER")
    first = datetime.fromisoformat(client.get(MEMBERSHIP).json()["ngay_het_han"])
    _buy_and_pay(client, "SILVER")
    second = datetime.fromisoformat(client.get(MEMBERSHIP).json()["ngay_het_han"])
    assert (second - first).days >= 29  # cộng nối tiếp thêm ~30 ngày


def test_expired_membership_falls_back_to_standard(client, login_as):
    login_as("u-vip-expired")
    _buy_and_pay(client, "GOLD")
    _expire_membership("u-vip-expired")

    m = client.get(MEMBERSHIP).json()
    assert m["ma_hang"] == "STANDARD"
    assert m["phan_tram_giam"] == 0
    assert m["con_han"] is False


def test_unknown_package_returns_404(client, login_as):
    login_as("u-vip-404")
    assert client.post(PURCHASE, json={"goi_id": 99999}).status_code == 404


def test_cannot_pay_another_users_transaction(client, login_as):
    login_as("u-vip-owner")
    txn = client.post(PURCHASE, json={"goi_id": _package_id(client, "GOLD")}).json()

    login_as("u-vip-thief")
    r = client.post(f"{TXNS}/{txn['ma_giao_dich']}/mock-pay")
    assert r.status_code == 404


def test_transactions_only_list_own(client, login_as):
    login_as("u-vip-hist-a")
    client.post(PURCHASE, json={"goi_id": _package_id(client, "SILVER")})
    login_as("u-vip-hist-b")
    assert client.get(TXNS).json() == []


def test_vip_benefits_contract_for_checkout(client, login_as):
    """Service 4 (Laravel) đọc discount_percent ở cấp cao nhất của JSON."""
    login_as("u-vip-benefit")
    _buy_and_pay(client, "GOLD")

    r = client.get("/api/users/1/vip-benefits")
    assert r.status_code == 200
    body = r.json()
    assert body["discount_percent"] == 10
    assert body["free_shipping"] is True
    assert body["tier"] == "GOLD"
    assert body["user_id"] == "u-vip-benefit"