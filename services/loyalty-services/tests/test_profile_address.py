"""Test hồ sơ cá nhân và sổ địa chỉ."""

from __future__ import annotations

ME = "/api/v1/users/me"
ADDR = "/api/v1/users/me/addresses"


def _address(**overrides):
    body = {
        "ten_nguoi_nhan": "Nguyen Van A",
        "so_dien_thoai": "0912345678",
        "tinh_thanh": "TP HCM",
        "quan_huyen": "Quan 1",
        "phuong_xa": "Ben Nghe",
        "dia_chi_chi_tiet": "123 Nguyen Hue",
    }
    body.update(overrides)
    return body


def test_profile_is_created_on_first_call(client, login_as):
    login_as("u-profile-1")
    r = client.get(ME)
    assert r.status_code == 200
    body = r.json()
    assert body["auth_user_id"] == "u-profile-1"
    assert body["email"] == "tester@test.com"  # lấy từ IAM (đã giả lập)
    assert body["ho_ten"] == "Tester"


def test_update_profile(client, login_as):
    login_as("u-profile-2")
    r = client.put(ME, json={"so_dien_thoai": "0912345678", "gioi_tinh": "NAM"})
    assert r.status_code == 200
    body = r.json()
    assert body["so_dien_thoai"] == "0912345678"
    assert body["gioi_tinh"] == "NAM"
    assert body["email"] == "tester@test.com"  # email không bị đổi


def test_update_profile_rejects_bad_phone(client, login_as):
    login_as("u-profile-3")
    r = client.put(ME, json={"so_dien_thoai": "abc"})
    assert r.status_code == 422


def test_first_address_becomes_default(client, login_as):
    login_as("u-addr-1")
    r = client.post(ADDR, json=_address())
    assert r.status_code == 201
    assert r.json()["mac_dinh"] is True


def test_only_one_default_address(client, login_as):
    login_as("u-addr-2")
    client.post(ADDR, json=_address())
    second = client.post(ADDR, json=_address(dia_chi_chi_tiet="456 Le Loi")).json()
    assert second["mac_dinh"] is False

    r = client.put(f"{ADDR}/{second['id']}/default")
    assert r.status_code == 200

    defaults = [a for a in client.get(ADDR).json() if a["mac_dinh"]]
    assert len(defaults) == 1
    assert defaults[0]["id"] == second["id"]


def test_deleting_default_promotes_another(client, login_as):
    login_as("u-addr-3")
    first = client.post(ADDR, json=_address()).json()
    client.post(ADDR, json=_address(dia_chi_chi_tiet="456 Le Loi"))

    assert client.delete(f"{ADDR}/{first['id']}").status_code == 204
    remaining = client.get(ADDR).json()
    assert len(remaining) == 1
    assert remaining[0]["mac_dinh"] is True


def test_cannot_touch_another_users_address(client, login_as):
    login_as("u-owner")
    addr = client.post(ADDR, json=_address()).json()

    login_as("u-intruder")
    assert client.put(f"{ADDR}/{addr['id']}", json={"tinh_thanh": "Ha Noi"}).status_code == 404
    assert client.delete(f"{ADDR}/{addr['id']}").status_code == 404