"""Pydantic schemas (request / response) for the User Service."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ── Request bodies ───────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    ho_ten: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    so_dien_thoai: str | None = Field(None, max_length=20)
    dia_chi: str | None = Field(None, max_length=500)
    vai_tro: str = Field("khachhang", max_length=50)
    kich_hoat: bool = True


class UserUpdate(BaseModel):
    ho_ten: str | None = Field(None, min_length=1, max_length=255)
    so_dien_thoai: str | None = Field(None, max_length=20)
    dia_chi: str | None = Field(None, max_length=500)
    vai_tro: str | None = Field(None, max_length=50)
    kich_hoat: bool | None = None


# ── Response bodies ──────────────────────────────────────────────────────────

class UserOut(BaseModel):
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


class UserListOut(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    page_size: int
