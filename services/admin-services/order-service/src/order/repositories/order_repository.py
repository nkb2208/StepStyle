"""Truy vấn bảng donhang (kèm chi tiết, thanh toán, khách hàng)."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from order.models import DonHang


class OrderRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

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

    async def flush(self) -> None:
        await self._session.flush()
