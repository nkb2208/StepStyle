"""ORM mapping of the store-configuration tables of `stepstyle_db`.

Only the three tables owned by this service are mapped:

* :class:`CaiDatCuaHang`                → ``caidatcuahang``
* :class:`CaiDatPhuongThucThanhToan`    → ``caidatphuongthucthanhtoan``
* :class:`CaiDatDoiTacVanChuyen`        → ``caidatdoitacvanchuyen``

Table and column names intentionally keep the original Vietnamese naming so the
service stays a 1:1 mapping of the shared database (see ``StepStyle-v2.sql``).
API field names are translated to English in :mod:`systemconfig.schemas`.
"""

from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects import mysql
from sqlalchemy.orm import Mapped, mapped_column

from systemconfig.db import Base

# ── Enumerations (stored as the string values defined in the schema) ────────


class PaymentMethodCode(enum.StrEnum):
    """`caidatphuongthucthanhtoan.code_phuong_thuc` — stable payment identifiers.

    Display names live in the table (they are data, not keys); new methods only
    need a member here plus a row in ``PAYMENT_METHOD_DEFAULTS``.
    """

    COD = "cod"
    CARD = "card"
    MOMO = "momo"
    ZALOPAY = "zalopay"
    VNPAY = "vnpay"
    BANK_TRANSFER = "bank_transfer"


class ShippingPartnerCode(enum.StrEnum):
    """`caidatdoitacvanchuyen.code_doi_tac` — stable carrier identifiers."""

    GHTK = "ghtk"
    GHN = "ghn"
    JNT = "jnt"
    VIETTELPOST = "viettelpost"


# MySQL columns are UNSIGNED; the variant keeps the models portable so the test
# suite can run on SQLite without the MySQL dialect.
UNSIGNED_INT = Integer().with_variant(mysql.INTEGER(unsigned=True), "mysql")
UNSIGNED_BIGINT = BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql")

# ── Store settings defaults (mirrored by the DDL defaults of the tables) ─────

DEFAULT_STORE_NAME = "Not configured"
DEFAULT_BASE_SHIPPING_FEE = Decimal(35000)
DEFAULT_FREE_SHIPPING_THRESHOLD = Decimal(500000)


class CaiDatCuaHang(Base):
    """Store settings — one row per store (`caidatcuahang`).

    The service reads/writes the first row (the store singleton) and creates it
    with :data:`DEFAULT_*` values on first access, so an existing database never
    needs a data migration to answer ``GET /api/v1/settings/store``.
    """

    __tablename__ = "caidatcuahang"

    ma_cai_dat: Mapped[int] = mapped_column(UNSIGNED_INT, primary_key=True, autoincrement=True)
    ten_cua_hang: Mapped[str] = mapped_column(String(255), default=DEFAULT_STORE_NAME)
    email_lien_he: Mapped[str | None] = mapped_column(String(255))
    so_dien_thoai: Mapped[str | None] = mapped_column(String(20))
    # Structured primary warehouse address (detail / ward / district / province)
    # so shipping calculations never have to parse a single free-text line.
    dia_chi_kho: Mapped[str | None] = mapped_column(String(255))
    phuong_xa: Mapped[str | None] = mapped_column(String(100))
    quan_huyen: Mapped[str | None] = mapped_column(String(100))
    tinh_thanh: Mapped[str | None] = mapped_column(String(100))
    phi_van_chuyen_co_ban: Mapped[Decimal] = mapped_column(
        Numeric(15, 0), default=DEFAULT_BASE_SHIPPING_FEE
    )
    nguong_mien_phi_van_chuyen: Mapped[Decimal] = mapped_column(
        Numeric(15, 0), default=DEFAULT_FREE_SHIPPING_THRESHOLD
    )
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_cap_nhat: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class CaiDatPhuongThucThanhToan(Base):
    """One togglable payment method of the store (`caidatphuongthucthanhtoan`).

    Separate from `phuongthucthanhtoan` (the catalog referenced by `thanhtoan`):
    that table has no stable code and its rows are created by admins, while this
    row is pure configuration keyed by :class:`PaymentMethodCode`.
    """

    __tablename__ = "caidatphuongthucthanhtoan"
    __table_args__ = (UniqueConstraint("ma_cai_dat", "code_phuong_thuc"),)

    ma_cai_dat_phuong_thuc: Mapped[int] = mapped_column(
        UNSIGNED_INT, primary_key=True, autoincrement=True
    )
    ma_cai_dat: Mapped[int] = mapped_column(
        UNSIGNED_INT,
        ForeignKey("caidatcuahang.ma_cai_dat", ondelete="CASCADE", onupdate="CASCADE"),
    )
    code_phuong_thuc: Mapped[str] = mapped_column(String(30))
    ten_phuong_thuc: Mapped[str] = mapped_column(String(100))
    mo_ta: Mapped[str | None] = mapped_column(String(255))
    kich_hoat: Mapped[bool] = mapped_column(Boolean, default=False)


class CaiDatDoiTacVanChuyen(Base):
    """One togglable shipping carrier of the store (`caidatdoitacvanchuyen`).

    Carrier-specific integration settings (api key, shop id, …) can be added as
    new columns later without reshaping this table or its API payload.
    """

    __tablename__ = "caidatdoitacvanchuyen"
    __table_args__ = (UniqueConstraint("ma_cai_dat", "code_doi_tac"),)

    ma_cai_dat_doi_tac: Mapped[int] = mapped_column(
        UNSIGNED_INT, primary_key=True, autoincrement=True
    )
    ma_cai_dat: Mapped[int] = mapped_column(
        UNSIGNED_INT,
        ForeignKey("caidatcuahang.ma_cai_dat", ondelete="CASCADE", onupdate="CASCADE"),
    )
    code_doi_tac: Mapped[str] = mapped_column(String(30))
    ten_doi_tac: Mapped[str] = mapped_column(String(100))
    mo_ta: Mapped[str | None] = mapped_column(String(255))
    kich_hoat: Mapped[bool] = mapped_column(Boolean, default=False)
