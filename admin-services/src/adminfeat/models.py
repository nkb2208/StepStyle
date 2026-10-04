"""ORM mapping of the `stepstyle_db` schema (see ``StepStyle-v2.sql``).

Table and column names intentionally keep the original Vietnamese naming so
the service stays a 1:1 mapping of the shared database. API field names are
translated to English in :mod:`adminfeat.schemas`.
"""

from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects import mysql
from sqlalchemy.orm import Mapped, mapped_column, relationship

from adminfeat.db import Base

# ── Enumerations (stored as the MySQL ENUM values defined in the schema) ────


class Role(enum.StrEnum):
    """`nguoidung.vai_tro`."""

    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"
    STAFF = "STAFF"


class ProductStatus(enum.StrEnum):
    """`sanpham.trang_thai`."""

    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class DiscountType(enum.StrEnum):
    """`magiamgia.loai_giam_gia`."""

    PERCENT = "PERCENT"
    FIXED_AMOUNT = "FIXED_AMOUNT"


class OrderStatus(enum.StrEnum):
    """`donhang.trang_thai_don_hang`."""

    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class PaymentStatus(enum.StrEnum):
    """`thanhtoan.trang_thai_thanh_toan`."""

    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


UNSIGNED_INT = mysql.INTEGER(unsigned=True)
UNSIGNED_BIGINT = mysql.BIGINT(unsigned=True)


class NguoiDung(Base):
    __tablename__ = "nguoidung"

    ma_nguoi_dung: Mapped[int] = mapped_column(UNSIGNED_INT, primary_key=True, autoincrement=True)
    ho_ten: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    mat_khau: Mapped[str] = mapped_column(String(255))
    so_dien_thoai: Mapped[str | None] = mapped_column(String(20))
    dia_chi: Mapped[str | None] = mapped_column(Text)
    vai_tro: Mapped[str] = mapped_column(String(20), default=Role.CUSTOMER.value)
    trang_thai: Mapped[bool] = mapped_column(Boolean, default=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_cap_nhat: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class DanhMuc(Base):
    __tablename__ = "danhmuc"

    ma_danh_muc: Mapped[int] = mapped_column(UNSIGNED_INT, primary_key=True, autoincrement=True)
    ten_danh_muc: Mapped[str] = mapped_column(String(255))
    mo_ta: Mapped[str | None] = mapped_column(Text)
    ma_danh_muc_cha: Mapped[int | None] = mapped_column(
        UNSIGNED_INT, ForeignKey("danhmuc.ma_danh_muc", ondelete="SET NULL", onupdate="CASCADE")
    )

    parent: Mapped[DanhMuc | None] = relationship(
        remote_side="DanhMuc.ma_danh_muc", back_populates="children"
    )
    children: Mapped[list[DanhMuc]] = relationship(back_populates="parent")


class MagiamGia(Base):
    __tablename__ = "magiamgia"

    ma_giam_gia: Mapped[int] = mapped_column(UNSIGNED_INT, primary_key=True, autoincrement=True)
    code_giam_gia: Mapped[str] = mapped_column(String(50), unique=True)
    loai_giam_gia: Mapped[str] = mapped_column(String(20), default="PERCENT")
    gia_tri_giam: Mapped[Decimal] = mapped_column(Numeric(15, 0), default=Decimal(0))
    gia_tri_toi_thieu: Mapped[Decimal] = mapped_column(Numeric(15, 0), default=Decimal(0))
    gia_tri_giam_toi_da: Mapped[Decimal | None] = mapped_column(Numeric(15, 0))
    so_luong: Mapped[int] = mapped_column(UNSIGNED_INT, default=0)
    so_luong_da_dung: Mapped[int] = mapped_column(UNSIGNED_INT, default=0)
    ngay_bat_dau: Mapped[datetime | None] = mapped_column(DateTime)
    ngay_ket_thuc: Mapped[datetime | None] = mapped_column(DateTime)
    kich_hoat: Mapped[bool] = mapped_column(Boolean, default=True)


class PhuongThucThanhToan(Base):
    __tablename__ = "phuongthucthanhtoan"

    ma_phuong_thuc: Mapped[int] = mapped_column(UNSIGNED_INT, primary_key=True, autoincrement=True)
    ten_phuong_thuc: Mapped[str] = mapped_column(String(100))
    mo_ta: Mapped[str | None] = mapped_column(Text)
    kich_hoat: Mapped[bool] = mapped_column(Boolean, default=True)


class SanPham(Base):
    __tablename__ = "sanpham"
    __table_args__ = (Index("idx_sanpham_dm_tt_ngay", "ma_danh_muc", "trang_thai", "ngay_tao"),)

    ma_san_pham: Mapped[int] = mapped_column(UNSIGNED_INT, primary_key=True, autoincrement=True)
    ten_san_pham: Mapped[str] = mapped_column(String(255))
    gia_goc: Mapped[Decimal] = mapped_column(Numeric(15, 0), default=Decimal(0))
    gia_khuyen_mai: Mapped[Decimal | None] = mapped_column(Numeric(15, 0))
    mo_ta: Mapped[str | None] = mapped_column(Text)
    hinh_anh_dai_dien: Mapped[str | None] = mapped_column(String(255))
    trang_thai: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    ma_danh_muc: Mapped[int | None] = mapped_column(
        UNSIGNED_INT, ForeignKey("danhmuc.ma_danh_muc", ondelete="SET NULL", onupdate="CASCADE")
    )
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_cap_nhat: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    category: Mapped[DanhMuc | None] = relationship()
    variants: Mapped[list[BienTheSanPham]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class BienTheSanPham(Base):
    __tablename__ = "bienthesanpham"

    ma_bien_the: Mapped[int] = mapped_column(UNSIGNED_INT, primary_key=True, autoincrement=True)
    ma_san_pham: Mapped[int] = mapped_column(
        UNSIGNED_INT,
        ForeignKey("sanpham.ma_san_pham", ondelete="CASCADE", onupdate="CASCADE"),
    )
    kich_co: Mapped[str] = mapped_column(String(20))
    mau_sac: Mapped[str] = mapped_column(String(50))
    so_luong_kho: Mapped[int] = mapped_column(UNSIGNED_INT, default=0)
    hinh_anh_bien_the: Mapped[str | None] = mapped_column(String(255))

    product: Mapped[SanPham] = relationship(back_populates="variants")


class DonHang(Base):
    __tablename__ = "donhang"
    __table_args__ = (
        Index("idx_donhang_user_ngay", "ma_nguoi_dung", "ngay_dat"),
        Index("idx_donhang_tt_ngay", "trang_thai_don_hang", "ngay_dat"),
    )

    ma_don_hang: Mapped[int] = mapped_column(UNSIGNED_BIGINT, primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int | None] = mapped_column(
        UNSIGNED_INT, ForeignKey("nguoidung.ma_nguoi_dung", ondelete="SET NULL", onupdate="CASCADE")
    )
    ten_nguoi_nhan: Mapped[str] = mapped_column(String(255))
    so_dien_thoai_nhan: Mapped[str] = mapped_column(String(20))
    dia_chi_giao_hang: Mapped[str] = mapped_column(Text)
    tong_tien_hang: Mapped[Decimal] = mapped_column(Numeric(15, 0), default=Decimal(0))
    tien_giam_gia: Mapped[Decimal] = mapped_column(Numeric(15, 0), default=Decimal(0))
    phi_van_chuyen: Mapped[Decimal] = mapped_column(Numeric(15, 0), default=Decimal(0))
    tong_thanh_toan: Mapped[Decimal] = mapped_column(Numeric(15, 0), default=Decimal(0))
    trang_thai_don_hang: Mapped[str] = mapped_column(String(20), default="PENDING")
    ma_giam_gia: Mapped[int | None] = mapped_column(
        UNSIGNED_INT, ForeignKey("magiamgia.ma_giam_gia", ondelete="SET NULL", onupdate="CASCADE")
    )
    ghi_chu: Mapped[str | None] = mapped_column(Text)
    ngay_dat: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_cap_nhat: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped[NguoiDung | None] = relationship()
    discount: Mapped[MagiamGia | None] = relationship()
    items: Mapped[list[ChiTietDonHang]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )
    payments: Mapped[list[ThanhToan]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class ChiTietDonHang(Base):
    __tablename__ = "chitietdonhang"

    ma_chi_tiet: Mapped[int] = mapped_column(UNSIGNED_BIGINT, primary_key=True, autoincrement=True)
    ma_don_hang: Mapped[int] = mapped_column(
        UNSIGNED_BIGINT,
        ForeignKey("donhang.ma_don_hang", ondelete="CASCADE", onupdate="CASCADE"),
    )
    ma_bien_the: Mapped[int] = mapped_column(
        UNSIGNED_INT,
        ForeignKey("bienthesanpham.ma_bien_the", ondelete="RESTRICT", onupdate="CASCADE"),
    )
    ten_san_pham: Mapped[str] = mapped_column(String(255))
    kich_co: Mapped[str] = mapped_column(String(20))
    mau_sac: Mapped[str] = mapped_column(String(50))
    so_luong: Mapped[int] = mapped_column(UNSIGNED_INT, default=1)
    don_gia: Mapped[Decimal] = mapped_column(Numeric(15, 0), default=Decimal(0))

    order: Mapped[DonHang] = relationship(back_populates="items")
    variant: Mapped[BienTheSanPham] = relationship()


class ThanhToan(Base):
    __tablename__ = "thanhtoan"

    ma_thanh_toan: Mapped[int] = mapped_column(
        UNSIGNED_BIGINT, primary_key=True, autoincrement=True
    )
    ma_don_hang: Mapped[int] = mapped_column(
        UNSIGNED_BIGINT,
        ForeignKey("donhang.ma_don_hang", ondelete="CASCADE", onupdate="CASCADE"),
    )
    ma_phuong_thuc: Mapped[int | None] = mapped_column(
        UNSIGNED_INT,
        ForeignKey("phuongthucthanhtoan.ma_phuong_thuc", ondelete="SET NULL", onupdate="CASCADE"),
    )
    so_tien: Mapped[Decimal] = mapped_column(Numeric(15, 0), default=Decimal(0))
    trang_thai_thanh_toan: Mapped[str] = mapped_column(String(20), default="PENDING")
    ma_giao_dich_cong: Mapped[str | None] = mapped_column(String(100))
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_thanh_toan: Mapped[datetime | None] = mapped_column(DateTime)

    order: Mapped[DonHang] = relationship(back_populates="payments")
    method: Mapped[PhuongThucThanhToan | None] = relationship()
