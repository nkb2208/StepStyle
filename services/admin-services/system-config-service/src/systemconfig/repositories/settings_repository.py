"""Repository layer: SQL queries and persistence for the store-configuration tables.

Only data access lives here — validation and business rules belong to
:mod:`systemconfig.services.settings_service`.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from systemconfig.models import (
    CaiDatCuaHang,
    CaiDatDoiTacVanChuyen,
    CaiDatPhuongThucThanhToan,
)


class SettingsRepository:
    """Thin async data-access object over the three `caidat*` tables."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ── Store singleton ─────────────────────────────────────────────────────
    async def get_store(self) -> CaiDatCuaHang | None:
        """The store settings row (the lowest `ma_cai_dat`), or ``None``."""
        result = await self.session.execute(
            select(CaiDatCuaHang).order_by(CaiDatCuaHang.ma_cai_dat).limit(1)
        )
        return result.scalars().first()

    def add_store(self, row: CaiDatCuaHang) -> None:
        self.session.add(row)

    # ── Payment methods ─────────────────────────────────────────────────────
    async def list_payment_methods(self, settings_id: int) -> list[CaiDatPhuongThucThanhToan]:
        result = await self.session.execute(
            select(CaiDatPhuongThucThanhToan)
            .where(CaiDatPhuongThucThanhToan.ma_cai_dat == settings_id)
            .order_by(CaiDatPhuongThucThanhToan.ma_cai_dat_phuong_thuc)
        )
        return list(result.scalars())

    async def get_payment_method(
        self, settings_id: int, method_id: int
    ) -> CaiDatPhuongThucThanhToan | None:
        result = await self.session.execute(
            select(CaiDatPhuongThucThanhToan).where(
                CaiDatPhuongThucThanhToan.ma_cai_dat == settings_id,
                CaiDatPhuongThucThanhToan.ma_cai_dat_phuong_thuc == method_id,
            )
        )
        return result.scalars().first()

    def add_payment_method(self, row: CaiDatPhuongThucThanhToan) -> None:
        self.session.add(row)

    # ── Shipping partners ───────────────────────────────────────────────────
    async def list_shipping_partners(self, settings_id: int) -> list[CaiDatDoiTacVanChuyen]:
        result = await self.session.execute(
            select(CaiDatDoiTacVanChuyen)
            .where(CaiDatDoiTacVanChuyen.ma_cai_dat == settings_id)
            .order_by(CaiDatDoiTacVanChuyen.ma_cai_dat_doi_tac)
        )
        return list(result.scalars())

    async def get_shipping_partner(
        self, settings_id: int, partner_id: int
    ) -> CaiDatDoiTacVanChuyen | None:
        result = await self.session.execute(
            select(CaiDatDoiTacVanChuyen).where(
                CaiDatDoiTacVanChuyen.ma_cai_dat == settings_id,
                CaiDatDoiTacVanChuyen.ma_cai_dat_doi_tac == partner_id,
            )
        )
        return result.scalars().first()

    def add_shipping_partner(self, row: CaiDatDoiTacVanChuyen) -> None:
        self.session.add(row)

    async def flush(self) -> None:
        await self.session.flush()
