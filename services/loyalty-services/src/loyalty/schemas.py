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