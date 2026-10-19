"""Pydantic schemas (request / response) cho Order Service."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from order.models import TrangThaiDonHang, TrangThaiThanhToan


def _upper_enum(value: str, enum_cls) -> str:
    v = (value or "").upper().strip()
    if v not in {e.value for e in enum_cls}:
        raise ValueError(f"Giá trị '{value}' không hợp lệ. Hợp lệ: {', '.join(e.value for e in enum_cls)}")
    return v


# ── Request ──────────────────────────────────────────────────────────────────

class OrderStatusUpdate(BaseModel):
    trang_thai: str = Field(..., description="PENDING | PROCESSING | SHIPPED | DELIVERED | CANCELLED")

    @field_validator("trang_thai")
    @classmethod
    def _v(cls, v: str) -> str:
        return _upper_enum(v, TrangThaiDonHang)


class PaymentStatusUpdate(BaseModel):
    trang_thai_thanh_toan: str = Field(..., description="PENDING | SUCCESS | FAILED | REFUNDED")

    @field_validator("trang_thai_thanh_toan")
    @classmethod
    def _v(cls, v: str) -> str:
        return _upper_enum(v, TrangThaiThanhToan)


# ── Response ─────────────────────────────────────────────────────────────────

class OrderItemOut(BaseModel):
    id: int
    ma_bien_the: int
    ten_san_pham: str
    kich_co: str
    mau_sac: str
    so_luong: int
    don_gia: int
    thanh_tien: int


class PaymentOut(BaseModel):
    id: int
    phuong_thuc: str | None = None
    so_tien: int
    trang_thai: str
    ma_giao_dich_cong: str | None = None
    ngay_tao: datetime
    ngay_thanh_toan: datetime | None = None


class OrderSummaryOut(BaseModel):
    id: int
    ma_nguoi_dung: int | None = None
    ten_nguoi_nhan: str
    so_dien_thoai_nhan: str
    email_khach: str | None = None
    tong_thanh_toan: int
    trang_thai: str
    phuong_thuc_thanh_toan: str | None = None
    trang_thai_thanh_toan: str | None = None
    so_san_pham: int
    ngay_dat: datetime


class OrderDetailOut(OrderSummaryOut):
    dia_chi_giao_hang: str
    tong_tien_hang: int
    tien_giam_gia: int
    phi_van_chuyen: int
    ghi_chu: str | None = None
    ngay_cap_nhat: datetime
    items: list[OrderItemOut]
    thanh_toan: list[PaymentOut]
    trang_thai_ke_tiep: list[str] = Field(description="Các trạng thái có thể chuyển tới")


class OrderListOut(BaseModel):
    items: list[OrderSummaryOut]
    total: int
    page: int
    page_size: int


class OrderStatsOut(BaseModel):
    pending: int = 0
    processing: int = 0
    shipped: int = 0
    delivered: int = 0
    cancelled: int = 0
    total: int = 0
