"""SQLAlchemy ORM models for the User Service.

Maps the ``nguoidung`` table of ``stepstyle_db``.

Vai trò:
- ``CUSTOMER``  – Khách hàng
- ``ADMIN``     – Quản trị viên
- ``STAFF``     – Nhân viên
- ``SELLER``    – Người bán
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from user.db import Base


class VaiTro(str, enum.Enum):
    """Vai trò người dùng trong hệ thống StepStyle."""

    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"
    STAFF = "STAFF"
    SELLER = "SELLER"


class NguoiDung(Base):
    """Ánh xạ bảng ``nguoidung`` trong stepstyle_db."""

    __tablename__ = "nguoidung"

    id: Mapped[int] = mapped_column(
        "ma_nguoi_dung", Integer, primary_key=True, autoincrement=True
    )
    ho_ten: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    mat_khau: Mapped[str] = mapped_column(String(255), nullable=False, default="123456")
    so_dien_thoai: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dia_chi: Mapped[str | None] = mapped_column(String(500), nullable=True)
    vai_tro: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=VaiTro.CUSTOMER.value,
    )
    kich_hoat: Mapped[bool] = mapped_column(
        "trang_thai", Boolean, nullable=False, default=True
    )
    ngay_tao: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    ngay_cap_nhat: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
