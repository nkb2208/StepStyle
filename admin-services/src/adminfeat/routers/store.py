"""Store settings: information, primary warehouse address, payment methods and
shipping configuration (``GET/PATCH /store/settings``).

The store is a single row of `caidatcuahang`; payment methods and shipping
carriers are rows of `caidatphuongthucthanhtoan` / `caidatdoitacvanchuyen`
keyed by a stable code, so display names stay data and new options can be added
without touching existing rows.
"""

from __future__ import annotations

from collections.abc import Sequence
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from adminfeat.common import money
from adminfeat.db import get_session
from adminfeat.models import (
    DEFAULT_BASE_SHIPPING_FEE,
    DEFAULT_FREE_SHIPPING_THRESHOLD,
    CaiDatCuaHang,
    CaiDatDoiTacVanChuyen,
    CaiDatPhuongThucThanhToan,
    PaymentMethodCode,
    ShippingPartnerCode,
)
from adminfeat.schemas import StoreSettingsUpdate
from adminfeat.security import require_permission

router = APIRouter(prefix="/store", tags=["store"])

READ = [Depends(require_permission("store_setting:read"))]
UPDATE = [Depends(require_permission("store_setting:update"))]

# Default option catalog: code, display name, description, enabled. Everything
# starts disabled — no gateway or carrier integration exists yet, so nothing is
# offered to customers before an administrator turns it on.
#
# Extending the lists only needs an enum member plus a tuple here: the missing
# row is materialised in the database on the next read, no schema change.
PAYMENT_METHOD_DEFAULTS: tuple[tuple[PaymentMethodCode, str, str | None, bool], ...] = (
    (PaymentMethodCode.COD, "COD", "Cash on delivery", False),
    (PaymentMethodCode.CARD, "Credit / Debit Card", "Visa, Mastercard", False),
    (PaymentMethodCode.MOMO, "MoMo", "MoMo e-wallet", False),
    (PaymentMethodCode.ZALOPAY, "ZaloPay", "ZaloPay e-wallet", False),
    (PaymentMethodCode.VNPAY, "VNPay", "VNPay gateway", False),
    (PaymentMethodCode.BANK_TRANSFER, "Bank Transfer", "Direct bank transfer", False),
)

SHIPPING_PARTNER_DEFAULTS: tuple[tuple[ShippingPartnerCode, str, str | None, bool], ...] = (
    (ShippingPartnerCode.GHTK, "GHTK", "Giao Hàng Tiết Kiệm", False),
    (ShippingPartnerCode.GHN, "GHN", "Giao Hàng Nhanh", False),
    (ShippingPartnerCode.JNT, "J&T Express", None, False),
    (ShippingPartnerCode.VIETTELPOST, "ViettelPost", None, False),
)


def to_dict(
    row: CaiDatCuaHang,
    payment_methods: Sequence[CaiDatPhuongThucThanhToan],
    shipping_partners: Sequence[CaiDatDoiTacVanChuyen],
) -> dict[str, Any]:
    return {
        "store_name": row.ten_cua_hang,
        "contact_email": row.email_lien_he,
        "phone": row.so_dien_thoai,
        "warehouse_address": {
            "detail": row.dia_chi_kho,
            "ward": row.phuong_xa,
            "district": row.quan_huyen,
            "province": row.tinh_thanh,
        },
        "base_shipping_fee": money(row.phi_van_chuyen_co_ban),
        "free_shipping_threshold": money(row.nguong_mien_phi_van_chuyen),
        "payment_methods": [
            {
                "code": method.code_phuong_thuc,
                "name": method.ten_phuong_thuc,
                "description": method.mo_ta,
                "enabled": method.kich_hoat,
            }
            for method in payment_methods
        ],
        "shipping_partners": [
            {
                "code": partner.code_doi_tac,
                "name": partner.ten_doi_tac,
                "description": partner.mo_ta,
                "enabled": partner.kich_hoat,
            }
            for partner in shipping_partners
        ],
        "created_at": row.ngay_tao,
        "updated_at": row.ngay_cap_nhat,
    }


async def _select_settings(session: AsyncSession) -> CaiDatCuaHang | None:
    result = await session.execute(select(CaiDatCuaHang).order_by(CaiDatCuaHang.ma_cai_dat))
    return result.scalars().first()


async def _payment_rows(
    session: AsyncSession, settings_id: int
) -> list[CaiDatPhuongThucThanhToan]:
    result = await session.execute(
        select(CaiDatPhuongThucThanhToan)
        .where(CaiDatPhuongThucThanhToan.ma_cai_dat == settings_id)
        .order_by(CaiDatPhuongThucThanhToan.ma_cai_dat_phuong_thuc)
    )
    return list(result.scalars())


async def _partner_rows(session: AsyncSession, settings_id: int) -> list[CaiDatDoiTacVanChuyen]:
    result = await session.execute(
        select(CaiDatDoiTacVanChuyen)
        .where(CaiDatDoiTacVanChuyen.ma_cai_dat == settings_id)
        .order_by(CaiDatDoiTacVanChuyen.ma_cai_dat_doi_tac)
    )
    return list(result.scalars())


async def _ensure_payment_methods(session: AsyncSession, settings_id: int) -> None:
    existing = {row.code_phuong_thuc for row in await _payment_rows(session, settings_id)}
    for code, name, description, enabled in PAYMENT_METHOD_DEFAULTS:
        if code.value not in existing:
            session.add(
                CaiDatPhuongThucThanhToan(
                    ma_cai_dat=settings_id,
                    code_phuong_thuc=code.value,
                    ten_phuong_thuc=name,
                    mo_ta=description,
                    kich_hoat=enabled,
                )
            )
    await session.flush()


async def _ensure_shipping_partners(session: AsyncSession, settings_id: int) -> None:
    existing = {row.code_doi_tac for row in await _partner_rows(session, settings_id)}
    for code, name, description, enabled in SHIPPING_PARTNER_DEFAULTS:
        if code.value not in existing:
            session.add(
                CaiDatDoiTacVanChuyen(
                    ma_cai_dat=settings_id,
                    code_doi_tac=code.value,
                    ten_doi_tac=name,
                    mo_ta=description,
                    kich_hoat=enabled,
                )
            )
    await session.flush()


async def get_or_create_settings(session: AsyncSession) -> CaiDatCuaHang:
    """Settings singleton, created with the documented defaults on first access."""
    row = await _select_settings(session)
    if row is None:
        row = CaiDatCuaHang()
        session.add(row)
        await session.flush()
    await _ensure_payment_methods(session, row.ma_cai_dat)
    await _ensure_shipping_partners(session, row.ma_cai_dat)
    return row


async def _load(
    session: AsyncSession,
) -> tuple[CaiDatCuaHang, list[CaiDatPhuongThucThanhToan], list[CaiDatDoiTacVanChuyen]]:
    row = await get_or_create_settings(session)
    return (
        row,
        await _payment_rows(session, row.ma_cai_dat),
        await _partner_rows(session, row.ma_cai_dat),
    )


async def calculate_shipping_fee(session: AsyncSession, order_value: Decimal) -> Decimal:
    """``order_value >= free_shipping_threshold ? 0 : base_shipping_fee``.

    Used when an order does not carry an explicit fee. A store without a
    settings row still gets the built-in defaults instead of a free ride.
    """
    row = await _select_settings(session)
    base = Decimal(row.phi_van_chuyen_co_ban) if row else DEFAULT_BASE_SHIPPING_FEE
    threshold = Decimal(row.nguong_mien_phi_van_chuyen) if row else DEFAULT_FREE_SHIPPING_THRESHOLD
    return Decimal(0) if Decimal(order_value) >= threshold else base


async def _apply_payment_methods(
    session: AsyncSession, settings_id: int, updates: list[dict[str, Any]]
) -> None:
    rows = {row.code_phuong_thuc: row for row in await _payment_rows(session, settings_id)}
    for item in updates:
        option = rows.get(str(item["code"]))  # codes are validated against the enum
        if option is not None:
            option.kich_hoat = item["enabled"]
    await session.flush()


async def _apply_shipping_partners(
    session: AsyncSession, settings_id: int, updates: list[dict[str, Any]]
) -> None:
    rows = {row.code_doi_tac: row for row in await _partner_rows(session, settings_id)}
    for item in updates:
        option = rows.get(str(item["code"]))
        if option is not None:
            option.kich_hoat = item["enabled"]
    await session.flush()


@router.get("/settings", dependencies=READ)
async def get_store_settings(session: AsyncSession = Depends(get_session)) -> dict[str, Any]:
    row, payment_methods, shipping_partners = await _load(session)
    return {"store_settings": to_dict(row, payment_methods, shipping_partners)}


@router.patch("/settings", dependencies=UPDATE)
async def update_store_settings(
    payload: StoreSettingsUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row, _, _ = await _load(session)
    data = payload.model_dump(exclude_unset=True)

    if "store_name" in data:
        row.ten_cua_hang = data["store_name"]
    if "contact_email" in data:
        row.email_lien_he = data["contact_email"]
    if "phone" in data:
        row.so_dien_thoai = data["phone"]
    if "base_shipping_fee" in data:
        row.phi_van_chuyen_co_ban = data["base_shipping_fee"]
    if "free_shipping_threshold" in data:
        row.nguong_mien_phi_van_chuyen = data["free_shipping_threshold"]

    address = data.get("warehouse_address")
    if address is not None:
        if "detail" in address:
            row.dia_chi_kho = address["detail"]
        if "ward" in address:
            row.phuong_xa = address["ward"]
        if "district" in address:
            row.quan_huyen = address["district"]
        if "province" in address:
            row.tinh_thanh = address["province"]

    if "payment_methods" in data:
        await _apply_payment_methods(session, row.ma_cai_dat, data["payment_methods"])
    if "shipping_partners" in data:
        await _apply_shipping_partners(session, row.ma_cai_dat, data["shipping_partners"])

    await session.flush()
    payment_methods = await _payment_rows(session, row.ma_cai_dat)
    shipping_partners = await _partner_rows(session, row.ma_cai_dat)
    return {"store_settings": to_dict(row, payment_methods, shipping_partners)}
