"""Pydantic schemas (request / response) cho Order Service."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator

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
    co_the_sua: bool = Field(description="Còn sửa được thông tin giao hàng")
    co_the_xoa: bool = Field(description="Có thể xóa đơn (chỉ đơn đã hủy)")


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


# ── Create / Update ──────────────────────────────────────────────────────────

class OrderItemCreate(BaseModel):
    ma_bien_the: int = Field(..., ge=1)
    so_luong: int = Field(..., ge=1, le=1000)


class OrderCreate(BaseModel):
    """Admin tạo đơn thủ công (đặt qua điện thoại / tại quầy). Giá lấy từ DB, không nhận từ client."""

    ma_nguoi_dung: int | None = Field(None, ge=1, description="Để trống = khách vãng lai")
    ten_nguoi_nhan: str = Field(..., min_length=1, max_length=255)
    so_dien_thoai_nhan: str = Field(..., min_length=1, max_length=20)
    dia_chi_giao_hang: str = Field(..., min_length=1, max_length=1000)
    ma_phuong_thuc: int | None = Field(None, ge=1)
    phi_van_chuyen: int = Field(0, ge=0)
    tien_giam_gia: int = Field(0, ge=0)
    ghi_chu: str | None = Field(None, max_length=1000)
    items: list[OrderItemCreate] = Field(..., min_length=1, max_length=50)

    @field_validator("ten_nguoi_nhan", "so_dien_thoai_nhan", "dia_chi_giao_hang")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Không được để trống")
        return v


class OrderUpdate(BaseModel):
    """Sửa thông tin giao hàng (chỉ khi đơn còn PENDING / PROCESSING)."""

    ten_nguoi_nhan: str | None = Field(None, min_length=1, max_length=255)
    so_dien_thoai_nhan: str | None = Field(None, min_length=1, max_length=20)
    dia_chi_giao_hang: str | None = Field(None, min_length=1, max_length=1000)
    ghi_chu: str | None = Field(None, max_length=1000)

    @field_validator("ten_nguoi_nhan", "so_dien_thoai_nhan", "dia_chi_giao_hang")
    @classmethod
    def _strip(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Không được để trống")
        return v

    @model_validator(mode="after")
    def _at_least_one(self):
        if not self.model_fields_set:
            raise ValueError("Cần ít nhất một trường để cập nhật")
        return self


class VariantOptionOut(BaseModel):
    ma_bien_the: int
    ten_san_pham: str
    kich_co: str
    mau_sac: str
    don_gia: int
    so_luong_kho: int


class PaymentMethodOut(BaseModel):
    ma_phuong_thuc: int
    ten_phuong_thuc: str
