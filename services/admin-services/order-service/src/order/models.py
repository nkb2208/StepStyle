"""ORM models cho các bảng đơn hàng trong ``stepstyle_db``.

Chỉ ánh xạ những cột service này cần: donhang, chitietdonhang, thanhtoan,
phuongthucthanhtoan (đọc tên) và nguoidung (đọc tên/email khách).
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from order.db import Base

# BIGINT trên MySQL, INTEGER trên SQLite (SQLite chỉ autoincrement với INTEGER) — dùng cho test.
BigId = BigInteger().with_variant(Integer, "sqlite")


class TrangThaiDonHang(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class TrangThaiThanhToan(str, enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class NguoiDung(Base):
    __tablename__ = "nguoidung"

    id: Mapped[int] = mapped_column("ma_nguoi_dung", Integer, primary_key=True, autoincrement=True)
    ho_ten: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)


class PhuongThucThanhToan(Base):
    __tablename__ = "phuongthucthanhtoan"

    id: Mapped[int] = mapped_column("ma_phuong_thuc", Integer, primary_key=True, autoincrement=True)
    ten_phuong_thuc: Mapped[str] = mapped_column(String(100), nullable=False)


class SanPham(Base):
    __tablename__ = "sanpham"

    id: Mapped[int] = mapped_column("ma_san_pham", Integer, primary_key=True, autoincrement=True)
    ten_san_pham: Mapped[str] = mapped_column(String(255), nullable=False)
    gia_goc: Mapped[int] = mapped_column(Numeric(15, 0), nullable=False, default=0)
    gia_khuyen_mai: Mapped[int | None] = mapped_column(Numeric(15, 0), nullable=True)
    trang_thai: Mapped[str] = mapped_column(String(10), nullable=False, default="ACTIVE")


class BienTheSanPham(Base):
    __tablename__ = "bienthesanpham"

    id: Mapped[int] = mapped_column("ma_bien_the", Integer, primary_key=True, autoincrement=True)
    ma_san_pham: Mapped[int] = mapped_column(Integer, ForeignKey("sanpham.ma_san_pham"), nullable=False)
    kich_co: Mapped[str] = mapped_column(String(20), nullable=False)
    mau_sac: Mapped[str] = mapped_column(String(50), nullable=False)
    so_luong_kho: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    san_pham: Mapped[SanPham] = relationship(lazy="joined")


class DonHang(Base):
    __tablename__ = "donhang"

    id: Mapped[int] = mapped_column("ma_don_hang", BigId, primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("nguoidung.ma_nguoi_dung"), nullable=True
    )
    ten_nguoi_nhan: Mapped[str] = mapped_column(String(255), nullable=False)
    so_dien_thoai_nhan: Mapped[str] = mapped_column(String(20), nullable=False)
    dia_chi_giao_hang: Mapped[str] = mapped_column(Text, nullable=False)
    tong_tien_hang: Mapped[int] = mapped_column(Numeric(15, 0), nullable=False, default=0)
    tien_giam_gia: Mapped[int] = mapped_column(Numeric(15, 0), nullable=False, default=0)
    phi_van_chuyen: Mapped[int] = mapped_column(Numeric(15, 0), nullable=False, default=0)
    tong_thanh_toan: Mapped[int] = mapped_column(Numeric(15, 0), nullable=False, default=0)
    trang_thai: Mapped[str] = mapped_column(
        "trang_thai_don_hang", String(20), nullable=False, default=TrangThaiDonHang.PENDING.value
    )
    ghi_chu: Mapped[str | None] = mapped_column(Text, nullable=True)
    ngay_dat: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    ngay_cap_nhat: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    nguoi_dung: Mapped[NguoiDung | None] = relationship(lazy="selectin")
    items: Mapped[list[ChiTietDonHang]] = relationship(
        back_populates="don_hang",
        lazy="selectin",
        order_by="ChiTietDonHang.id",
        cascade="save-update, merge, delete, delete-orphan",
    )
    thanh_toan: Mapped[list[ThanhToan]] = relationship(
        back_populates="don_hang",
        lazy="selectin",
        order_by="ThanhToan.id",
        cascade="save-update, merge, delete, delete-orphan",
    )


class ChiTietDonHang(Base):
    __tablename__ = "chitietdonhang"

    id: Mapped[int] = mapped_column("ma_chi_tiet", BigId, primary_key=True, autoincrement=True)
    ma_don_hang: Mapped[int] = mapped_column(BigId, ForeignKey("donhang.ma_don_hang"), nullable=False)
    ma_bien_the: Mapped[int] = mapped_column(Integer, nullable=False)
    ten_san_pham: Mapped[str] = mapped_column(String(255), nullable=False)
    kich_co: Mapped[str] = mapped_column(String(20), nullable=False)
    mau_sac: Mapped[str] = mapped_column(String(50), nullable=False)
    so_luong: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    don_gia: Mapped[int] = mapped_column(Numeric(15, 0), nullable=False, default=0)

    don_hang: Mapped[DonHang] = relationship(back_populates="items")


class ThanhToan(Base):
    __tablename__ = "thanhtoan"

    id: Mapped[int] = mapped_column("ma_thanh_toan", BigId, primary_key=True, autoincrement=True)
    ma_don_hang: Mapped[int] = mapped_column(BigId, ForeignKey("donhang.ma_don_hang"), nullable=False)
    ma_phuong_thuc: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("phuongthucthanhtoan.ma_phuong_thuc"), nullable=True
    )
    so_tien: Mapped[int] = mapped_column(Numeric(15, 0), nullable=False, default=0)
    trang_thai: Mapped[str] = mapped_column(
        "trang_thai_thanh_toan", String(20), nullable=False, default=TrangThaiThanhToan.PENDING.value
    )
    ma_giao_dich_cong: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    ngay_thanh_toan: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    don_hang: Mapped[DonHang] = relationship(back_populates="thanh_toan")
    phuong_thuc: Mapped[PhuongThucThanhToan | None] = relationship(lazy="selectin")
