"""Pydantic schemas (request / response) for the User Service."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from user.models import VaiTro


# ── Request bodies ───────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    """Tạo người dùng mới — chỉ dành cho quản trị viên."""

    ho_ten: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    so_dien_thoai: str | None = Field(None, max_length=20)
    dia_chi: str | None = Field(None, max_length=500)
    vai_tro: Literal["khachhang", "nguoiban", "quantrivien"] = "khachhang"
    kich_hoat: bool = True


class UserUpdate(BaseModel):
    """Cập nhật thông tin — chỉ dành cho quản trị viên (patch bất kỳ trường nào)."""

    ho_ten: str | None = Field(None, min_length=1, max_length=255)
    so_dien_thoai: str | None = Field(None, max_length=20)
    dia_chi: str | None = Field(None, max_length=500)
    vai_tro: Literal["khachhang", "nguoiban", "quantrivien"] | None = None
    kich_hoat: bool | None = None


class ProfileUpdate(BaseModel):
    """Cập nhật thông tin cá nhân — khách hàng tự cập nhật (không đổi vai trò/trạng thái)."""

    ho_ten: str | None = Field(None, min_length=1, max_length=255)
    so_dien_thoai: str | None = Field(None, max_length=20)
    dia_chi: str | None = Field(None, max_length=500)


# ── Response bodies ──────────────────────────────────────────────────────────

class UserOut(BaseModel):
    """Thông tin người dùng đầy đủ — trả về cho quản trị viên."""

    model_config = {"from_attributes": True}

    id: int
    ho_ten: str
    email: str
    so_dien_thoai: str | None
    dia_chi: str | None
    vai_tro: str
    kich_hoat: bool
    ngay_tao: datetime
    ngay_cap_nhat: datetime


class ProfileOut(BaseModel):
    """Thông tin cá nhân — trả về cho khách hàng đang đăng nhập (không có vai_tro/kich_hoat)."""

    model_config = {"from_attributes": True}

    id: int
    ho_ten: str
    email: str
    so_dien_thoai: str | None
    dia_chi: str | None
    ngay_tao: datetime
    ngay_cap_nhat: datetime


class UserListOut(BaseModel):
    """Danh sách người dùng có phân trang."""

    items: list[UserOut]
    total: int
    page: int
    page_size: int

