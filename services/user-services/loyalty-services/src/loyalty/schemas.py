"""Pydantic schemas (request / response) cho Service 2."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ProfileOut(BaseModel):
    model_config = {"from_attributes": True}

    auth_user_id: str
    email: str | None = None
    ho_ten: str
    so_dien_thoai: str | None = None
    avatar_url: str | None = None
    ngay_sinh: datetime | None = None
    gioi_tinh: str | None = None


class ProfileUpdate(BaseModel):
    """Không có trường email: email do IAM quản lý, không cho sửa ở đây."""

    ho_ten: str | None = Field(None, min_length=1, max_length=255)
    so_dien_thoai: str | None = Field(None, pattern=r"^(0|\+84)\d{9,10}$")
    ngay_sinh: datetime | None = None
    gioi_tinh: str | None = Field(None, pattern=r"^(NAM|NU|KHAC)$")


class AddressBase(BaseModel):
    ten_nguoi_nhan: str = Field(..., min_length=1, max_length=255)
    so_dien_thoai: str = Field(..., pattern=r"^(0|\+84)\d{9,10}$")
    tinh_thanh: str = Field(..., min_length=1, max_length=100)
    quan_huyen: str = Field(..., min_length=1, max_length=100)
    phuong_xa: str = Field(..., min_length=1, max_length=100)
    dia_chi_chi_tiet: str = Field(..., min_length=1, max_length=500)


class AddressCreate(AddressBase):
    mac_dinh: bool = False


class AddressUpdate(BaseModel):
    """Chỉ gửi trường nào muốn đổi."""

    ten_nguoi_nhan: str | None = Field(None, min_length=1, max_length=255)
    so_dien_thoai: str | None = Field(None, pattern=r"^(0|\+84)\d{9,10}$")
    tinh_thanh: str | None = Field(None, min_length=1, max_length=100)
    quan_huyen: str | None = Field(None, min_length=1, max_length=100)
    phuong_xa: str | None = Field(None, min_length=1, max_length=100)
    dia_chi_chi_tiet: str | None = Field(None, min_length=1, max_length=500)
    mac_dinh: bool | None = None


class AddressOut(AddressBase):
    model_config = {"from_attributes": True}

    id: int
    mac_dinh: bool

    
class MembershipOut(BaseModel):
    ma_hang: str
    ten_hang: str
    phan_tram_giam: int
    mien_phi_van_chuyen: bool
    tong_diem: int
    ngay_het_han: datetime | None = None
    con_han: bool


class VipBenefitsOut(BaseModel):
    """Contract với Service 4: key `discount_percent` nằm ở cấp cao nhất."""

    user_id: str
    tier: str
    tier_name: str
    discount_percent: int
    free_shipping: bool
    expires_at: datetime | None = None
    

class VipPackageOut(BaseModel):
    id: int
    ten_goi: str
    gia: int
    so_ngay: int
    ma_hang: str


class PurchaseIn(BaseModel):
    goi_id: int


class TransactionOut(BaseModel):
    model_config = {"from_attributes": True}

    ma_giao_dich: str
    goi_id: int
    so_tien: int
    trang_thai: str
    ngay_tao: datetime
    ngay_thanh_toan: datetime | None = None