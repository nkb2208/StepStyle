"""Truy vấn bảng donhang (kèm chi tiết, thanh toán, khách hàng)."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from order.models import BienTheSanPham, DonHang, NguoiDung, PhuongThucThanhToan, SanPham


class OrderRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    @property
    def session(self) -> AsyncSession:
        return self._session

    async def get_by_id(self, order_id: int) -> DonHang | None:
        res = await self._session.execute(select(DonHang).where(DonHang.id == order_id))
        return res.scalar_one_or_none()

    async def list_orders(
        self,
        *,
        page: int,
        page_size: int,
        status: str | None = None,
        search: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> tuple[list[DonHang], int]:
        conditions = []
        if status:
            conditions.append(DonHang.trang_thai == status)
        if search:
            like = f"%{search.strip()}%"
            conditions.append(
                or_(
                    cast(DonHang.id, String).like(like),
                    DonHang.ten_nguoi_nhan.like(like),
                    DonHang.so_dien_thoai_nhan.like(like),
                )
            )
        if date_from:
            conditions.append(DonHang.ngay_dat >= datetime.combine(date_from, time.min))
        if date_to:  # bao gồm cả ngày date_to
            conditions.append(DonHang.ngay_dat < datetime.combine(date_to + timedelta(days=1), time.min))

        total = (
            await self._session.execute(select(func.count()).select_from(DonHang).where(*conditions))
        ).scalar_one()
        rows = await self._session.execute(
            select(DonHang)
            .where(*conditions)
            .order_by(DonHang.ngay_dat.desc(), DonHang.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(rows.scalars().all()), total

    async def count_by_status(self) -> dict[str, int]:
        res = await self._session.execute(
            select(DonHang.trang_thai, func.count()).group_by(DonHang.trang_thai)
        )
        return {status: count for status, count in res.all()}

    # ── Ghi ──────────────────────────────────────────────────────────────────

    def add(self, order: DonHang) -> None:
        self._session.add(order)

    async def delete(self, order: DonHang) -> None:
        await self._session.delete(order)
        await self._session.flush()

    async def flush(self) -> None:
        await self._session.flush()

    # ── Tra cứu phụ trợ cho tạo đơn ──────────────────────────────────────────

    async def user_exists(self, user_id: int) -> bool:
        res = await self._session.execute(select(NguoiDung.id).where(NguoiDung.id == user_id))
        return res.scalar_one_or_none() is not None

    async def payment_method_exists(self, method_id: int) -> bool:
        res = await self._session.execute(
            select(PhuongThucThanhToan.id).where(PhuongThucThanhToan.id == method_id)
        )
        return res.scalar_one_or_none() is not None

    async def list_payment_methods(self) -> list[PhuongThucThanhToan]:
        res = await self._session.execute(select(PhuongThucThanhToan).order_by(PhuongThucThanhToan.id))
        return list(res.scalars().all())

    async def get_variants(self, ids: list[int]) -> dict[int, BienTheSanPham]:
        res = await self._session.execute(select(BienTheSanPham).where(BienTheSanPham.id.in_(ids)))
        return {v.id: v for v in res.scalars().unique().all()}

    async def list_variants(self, search: str | None, limit: int) -> list[BienTheSanPham]:
        stmt = (
            select(BienTheSanPham)
            .join(SanPham, SanPham.id == BienTheSanPham.ma_san_pham)
            .where(SanPham.trang_thai == "ACTIVE")
            .order_by(SanPham.ten_san_pham, BienTheSanPham.kich_co, BienTheSanPham.mau_sac)
            .limit(limit)
        )
        if search:
            stmt = stmt.where(SanPham.ten_san_pham.like(f"%{search.strip()}%"))
        res = await self._session.execute(stmt)
        return list(res.scalars().unique().all())
