"""Pydantic schemas (request / response) for the User Service."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from user.models import VaiTro

_ROLE_MAP: dict[str, str] = {
    "khachhang": VaiTro.CUSTOMER.value,
    "customer": VaiTro.CUSTOMER.value,
    "quantrivien": VaiTro.ADMIN.value,
    "admin": VaiTro.ADMIN.value,
    "nhanvien": VaiTro.STAFF.value,
    "staff": VaiTro.STAFF.value,
    "nguoiban": VaiTro.SELLER.value,
    "seller": VaiTro.SELLER.value,
}


def _normalize_role(v: str | None) -> str | None:
    if v is None:
        return None
    normalized = _ROLE_MAP.get(v.lower().strip(), v.upper().strip())
    valid = {r.value for r in VaiTro}
    if normalized not in valid:
        raise ValueError(f"Vai trò '{v}' không hợp lệ. Các vai trò hợp lệ: {', '.join(valid)}")
    return normalized


# ── Request bodies ───────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    """Tạo người dùng mới."""

    ho_ten: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    mat_khau: str | None = Field(default="123456", min_length=4, max_length=128)
    so_dien_thoai: str | None = Field(None, max_length=20)
    dia_chi: str | None = Field(None, max_length=500)
    vai_tro: str = Field(default=VaiTro.CUSTOMER.value)
    kich_hoat: bool = True

    @field_validator("vai_tro", mode="before")
    @classmethod
    def validate_vai_tro(cls, v: str) -> str:
        return _normalize_role(v) or VaiTro.CUSTOMER.value


class UserUpdate(BaseModel):
    """Cập nhật thông tin — chỉ dành cho quản trị viên."""

    ho_ten: str | None = Field(None, min_length=1, max_length=255)
    mat_khau: str | None = Field(None, min_length=4, max_length=128)
    so_dien_thoai: str | None = Field(None, max_length=20)
    dia_chi: str | None = Field(None, max_length=500)
    vai_tro: str | None = None
    kich_hoat: bool | None = None

    @field_validator("vai_tro", mode="before")
    @classmethod
    def validate_vai_tro(cls, v: str | None) -> str | None:
        return _normalize_role(v)


# ── Response bodies ──────────────────────────────────────────────────────────

class UserOut(BaseModel):
    """Thông tin người dùng đầy đủ — trả về cho quản trị viên."""

    model_config = {"from_attributes": True}

    id: int
    ho_ten: str
    email: str
    so_dien_thoai: str | None = None
    dia_chi: str | None = None
    vai_tro: str
    kich_hoat: bool
    ngay_tao: datetime
    ngay_cap_nhat: datetime


class UserListOut(BaseModel):
    """Danh sách người dùng có phân trang."""

    items: list[UserOut]
    total: int
    page: int
    page_size: int
