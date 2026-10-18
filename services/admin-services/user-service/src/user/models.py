"""SQLAlchemy ORM models for the User Service.

Maps the ``nguoidung`` table of ``stepstyle_db``.

Vai trò:
- ``khachhang``   – Khách hàng (mặc định)
- ``quantrivien`` – Quản trị viên
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from user.db import Base


class VaiTro(str, enum.Enum):
    """Vai trò người dùng trong hệ thống StepStyle."""

    KHACH_HANG = "khachhang"
    NGUOI_BAN = "nguoiban"
    QUAN_TRI_VIEN = "quantrivien"


class NguoiDung(Base):
    """Ánh xạ bảng ``nguoidung`` trong stepstyle_db."""

    __tablename__ = "nguoidung"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ho_ten: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    so_dien_thoai: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dia_chi: Mapped[str | None] = mapped_column(String(500), nullable=True)
    vai_tro: Mapped[str] = mapped_column(
        Enum(VaiTro, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        default=VaiTro.KHACH_HANG.value,
    )
    kich_hoat: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ngay_tao: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    ngay_cap_nhat: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

