"""Service layer: business rules for the store configuration.

Storage access is delegated to
:class:`~systemconfig.repositories.settings_repository.SettingsRepository`;
validation beyond what Pydantic can express (existence, non-negative amounts,
whitelisted codes) happens here. Timestamps and money are serialised with the
conventions of the shared database (whole VND, naive local datetimes).
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from systemconfig.common import money
from systemconfig.errors import not_found
from systemconfig.models import (
    DEFAULT_BASE_SHIPPING_FEE,
    DEFAULT_FREE_SHIPPING_THRESHOLD,
    CaiDatCuaHang,
    CaiDatDoiTacVanChuyen,
    CaiDatPhuongThucThanhToan,
)
from systemconfig.repositories import SettingsRepository
from systemconfig.schemas import (
    PaymentMethodUpdate,
    ShippingPartnerUpdate,
    StoreSettingsUpdate,
)
from systemconfig.services.defaults import PAYMENT_METHOD_DEFAULTS, SHIPPING_PARTNER_DEFAULTS


def store_to_dict(row: CaiDatCuaHang) -> dict[str, Any]:
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
        "created_at": row.ngay_tao,
        "updated_at": row.ngay_cap_nhat,
    }


def payment_method_to_dict(row: CaiDatPhuongThucThanhToan) -> dict[str, Any]:
    return {
        "id": row.ma_cai_dat_phuong_thuc,
        "code": row.code_phuong_thuc,
        "name": row.ten_phuong_thuc,
        "description": row.mo_ta,
        "enabled": bool(row.kich_hoat),
    }


def shipping_partner_to_dict(row: CaiDatDoiTacVanChuyen) -> dict[str, Any]:
    return {
        "id": row.ma_cai_dat_doi_tac,
        "code": row.code_doi_tac,
        "name": row.ten_doi_tac,
        "description": row.mo_ta,
        "enabled": bool(row.kich_hoat),
    }


def public_option_to_dict(
    row: CaiDatPhuongThucThanhToan | CaiDatDoiTacVanChuyen,
) -> dict[str, Any]:
    """Customer-facing projection: code / name / description only.

    Ids and the ``enabled`` flag are internal; the storefront endpoint filters to
    enabled rows before serialising, so it never needs them.
    """
    if isinstance(row, CaiDatPhuongThucThanhToan):
        code, name = row.code_phuong_thuc, row.ten_phuong_thuc
    else:
        code, name = row.code_doi_tac, row.ten_doi_tac
    return {"code": code, "name": name, "description": row.mo_ta}


class SettingsService:
    """Business logic over the store singleton and its option rows."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = SettingsRepository(session)

    # ── Store singleton ─────────────────────────────────────────────────────
    async def get_or_create_store(self) -> CaiDatCuaHang:
        """Store settings for the shop, created with defaults on first access.

        A database that only received the three tables (for example an existing
        `stepstyle_db` migrated with ``migrations/001_store_settings.sql``) still
        answers correctly: the singleton row and the option catalog are written
        lazily and never overwrite an already-configured value.
        """
        row = await self.repo.get_store()
        if row is None:
            row = CaiDatCuaHang()
            self.repo.add_store(row)
            await self.repo.flush()
        await self._ensure_payment_methods(row.ma_cai_dat)
        await self._ensure_shipping_partners(row.ma_cai_dat)
        return row

    async def _ensure_payment_methods(self, settings_id: int) -> None:
        rows = await self.repo.list_payment_methods(settings_id)
        existing = {row.code_phuong_thuc for row in rows}
        for code, name, description, enabled in PAYMENT_METHOD_DEFAULTS:
            if code.value not in existing:
                self.repo.add_payment_method(
                    CaiDatPhuongThucThanhToan(
                        ma_cai_dat=settings_id,
                        code_phuong_thuc=code.value,
                        ten_phuong_thuc=name,
                        mo_ta=description,
                        kich_hoat=enabled,
                    )
                )
        await self.repo.flush()

    async def _ensure_shipping_partners(self, settings_id: int) -> None:
        rows = await self.repo.list_shipping_partners(settings_id)
        existing = {row.code_doi_tac for row in rows}
        for code, name, description, enabled in SHIPPING_PARTNER_DEFAULTS:
            if code.value not in existing:
                self.repo.add_shipping_partner(
                    CaiDatDoiTacVanChuyen(
                        ma_cai_dat=settings_id,
                        code_doi_tac=code.value,
                        ten_doi_tac=name,
                        mo_ta=description,
                        kich_hoat=enabled,
                    )
                )
        await self.repo.flush()

    async def get_store(self) -> dict[str, Any]:
        row = await self.get_or_create_store()
        return store_to_dict(row)

    async def update_store(self, payload: StoreSettingsUpdate) -> dict[str, Any]:
        row = await self.get_or_create_store()
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

        await self.repo.flush()
        await self.session.refresh(row)
        return store_to_dict(row)

    # ── Payment methods ─────────────────────────────────────────────────────
    async def list_payment_methods(self) -> list[dict[str, Any]]:
        row = await self.get_or_create_store()
        methods = await self.repo.list_payment_methods(row.ma_cai_dat)
        return [payment_method_to_dict(method) for method in methods]

    async def update_payment_method(
        self, method_id: int, payload: PaymentMethodUpdate
    ) -> dict[str, Any]:
        row = await self.get_or_create_store()
        method = await self.repo.get_payment_method(row.ma_cai_dat, method_id)
        if method is None:
            raise not_found("Payment method", code="PAYMENT_METHOD_NOT_FOUND")

        data = payload.model_dump(exclude_unset=True)
        if "enabled" in data:
            method.kich_hoat = data["enabled"]
        if "name" in data:
            method.ten_phuong_thuc = data["name"]
        if "description" in data:
            method.mo_ta = data["description"]

        await self.repo.flush()
        await self.session.refresh(method)
        return payment_method_to_dict(method)

    # ── Shipping partners ───────────────────────────────────────────────────
    async def list_shipping_partners(self) -> list[dict[str, Any]]:
        row = await self.get_or_create_store()
        partners = await self.repo.list_shipping_partners(row.ma_cai_dat)
        return [shipping_partner_to_dict(partner) for partner in partners]

    async def update_shipping_partner(
        self, partner_id: int, payload: ShippingPartnerUpdate
    ) -> dict[str, Any]:
        row = await self.get_or_create_store()
        partner = await self.repo.get_shipping_partner(row.ma_cai_dat, partner_id)
        if partner is None:
            raise not_found("Shipping partner", code="SHIPPING_PARTNER_NOT_FOUND")

        data = payload.model_dump(exclude_unset=True)
        if "enabled" in data:
            partner.kich_hoat = data["enabled"]
        if "name" in data:
            partner.ten_doi_tac = data["name"]
        if "description" in data:
            partner.mo_ta = data["description"]

        await self.repo.flush()
        await self.session.refresh(partner)
        return shipping_partner_to_dict(partner)

    # ── Public storefront ───────────────────────────────────────────────────
    async def get_storefront_settings(self) -> dict[str, Any]:
        """Non-sensitive configuration for the customer-facing storefront.

        Only *enabled* payment methods and carriers are returned (a disabled
        method is never offered to customers), together with the shipping rules
        the checkout needs to compute the delivery fee.
        """
        row = await self.get_or_create_store()
        methods = await self.repo.list_payment_methods(row.ma_cai_dat)
        partners = await self.repo.list_shipping_partners(row.ma_cai_dat)
        return {
            "store_name": row.ten_cua_hang,
            "base_shipping_fee": money(row.phi_van_chuyen_co_ban),
            "free_shipping_threshold": money(row.nguong_mien_phi_van_chuyen),
            "payment_methods": [
                public_option_to_dict(method) for method in methods if method.kich_hoat
            ],
            "shipping_partners": [
                public_option_to_dict(partner) for partner in partners if partner.kich_hoat
            ],
        }

    # ── Integration helper ──────────────────────────────────────────────────
    async def calculate_shipping_fee(self, order_value: Decimal) -> Decimal:
        """``order_value >= free_shipping_threshold ? 0 : base_shipping_fee``.

        Used when an order does not carry an explicit fee. A store without a
        settings row still gets the built-in defaults instead of a free ride.
        """
        row = await self.repo.get_store()
        base = Decimal(row.phi_van_chuyen_co_ban) if row else DEFAULT_BASE_SHIPPING_FEE
        threshold = (
            Decimal(row.nguong_mien_phi_van_chuyen) if row else DEFAULT_FREE_SHIPPING_THRESHOLD
        )
        return Decimal(0) if Decimal(order_value) >= threshold else base
