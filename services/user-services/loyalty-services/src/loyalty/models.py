"""ORM models cho Service 2: Profile, Địa chỉ, Hạng thành viên, Gói VIP.

Khoá người dùng là auth_user_id = claim `sub` trong JWT do IAM cấp.
Không đặt khoá ngoại sang bảng `nguoidung`. Tiền tệ lưu số nguyên VND.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from loyalty.db import Base


class TrangThaiGiaoDich(str, enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class HoSoNguoiDung(Base):
    __tablename__ = "ho_so_nguoi_dung"

    auth_user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    ho_ten: Mapped[str] = mapped_column(String(255), nullable=False, default="Khách hàng")
    so_dien_thoai: Mapped[str | None] = mapped_column(String(20), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ngay_sinh: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    gioi_tinh: Mapped[str | None] = mapped_column(String(10), nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    ngay_cap_nhat: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )


class DiaChiGiaoHang(Base):
    __tablename__ = "dia_chi_giao_hang"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    auth_user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    ten_nguoi_nhan: Mapped[str] = mapped_column(String(255), nullable=False)
    so_dien_thoai: Mapped[str] = mapped_column(String(20), nullable=False)
    tinh_thanh: Mapped[str] = mapped_column(String(100), nullable=False)
    quan_huyen: Mapped[str] = mapped_column(String(100), nullable=False)
    phuong_xa: Mapped[str] = mapped_column(String(100), nullable=False)
    dia_chi_chi_tiet: Mapped[str] = mapped_column(String(500), nullable=False)
    mac_dinh: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ngay_tao: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )


class HangThanhVien(Base):
    __tablename__ = "hang_thanh_vien"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ma_hang: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    ten_hang: Mapped[str] = mapped_column(String(100), nullable=False)
    cap_do: Mapped[int] = mapped_column(Integer, nullable=False)  # số lớn = hạng cao
    phan_tram_giam: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mien_phi_van_chuyen: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class ThanhVien(Base):
    __tablename__ = "thanh_vien"

    auth_user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    hang_id: Mapped[int] = mapped_column(ForeignKey("hang_thanh_vien.id"), nullable=False)
    tong_diem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ngay_het_han: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ngay_cap_nhat: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )


class GoiVip(Base):
    __tablename__ = "goi_vip"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ten_goi: Mapped[str] = mapped_column(String(100), nullable=False)
    gia: Mapped[int] = mapped_column(Integer, nullable=False)
    so_ngay: Mapped[int] = mapped_column(Integer, nullable=False)
    hang_id: Mapped[int] = mapped_column(ForeignKey("hang_thanh_vien.id"), nullable=False)
    dang_ban: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class GiaoDichVip(Base):
    __tablename__ = "giao_dich_vip"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ma_giao_dich: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    auth_user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    goi_id: Mapped[int] = mapped_column(ForeignKey("goi_vip.id"), nullable=False)
    so_tien: Mapped[int] = mapped_column(Integer, nullable=False)
    trang_thai: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TrangThaiGiaoDich.PENDING.value
    )
    ngay_tao: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    ngay_thanh_toan: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


OWNED_TABLES = [
    HoSoNguoiDung.__table__,
    DiaChiGiaoHang.__table__,
    HangThanhVien.__table__,
    ThanhVien.__table__,
    GoiVip.__table__,
    GiaoDichVip.__table__,
]