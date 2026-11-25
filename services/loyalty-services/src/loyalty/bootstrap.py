"""Tạo bảng của Service 2 (idempotent) và seed hạng + gói VIP mặc định."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine

from loyalty.db import session_scope
from loyalty.models import OWNED_TABLES, GoiVip, HangThanhVien

DEFAULT_TIERS = [
    # ma_hang, ten_hang, cap_do, % giảm, free ship
    ("STANDARD", "Thành viên", 0, 0, False),
    ("SILVER", "Bạc", 1, 5, False),
    ("GOLD", "Vàng", 2, 10, True),
    ("PLATINUM", "Bạch kim", 3, 15, True),
]

DEFAULT_PACKAGES = [
    # ten_goi, gia (VND), so_ngay, ma_hang
    ("VIP Bạc 30 ngày", 99_000, 30, "SILVER"),
    ("VIP Vàng 90 ngày", 249_000, 90, "GOLD"),
    ("VIP Bạch kim 365 ngày", 799_000, 365, "PLATINUM"),
]


async def create_tables(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: [t.create(sync_conn, checkfirst=True) for t in OWNED_TABLES]
        )


async def seed_defaults() -> None:
    async with session_scope() as session:
        tiers: dict[str, HangThanhVien] = {}
        for ma, ten, cap, giam, ship in DEFAULT_TIERS:
            row = (
                await session.execute(select(HangThanhVien).where(HangThanhVien.ma_hang == ma))
            ).scalar_one_or_none()
            if row is None:
                row = HangThanhVien(
                    ma_hang=ma,
                    ten_hang=ten,
                    cap_do=cap,
                    phan_tram_giam=giam,
                    mien_phi_van_chuyen=ship,
                )
                session.add(row)
                await session.flush()
            tiers[ma] = row

        has_pkg = (await session.execute(select(GoiVip.id).limit(1))).first()
        if has_pkg is None:
            for ten, gia, ngay, ma in DEFAULT_PACKAGES:
                session.add(GoiVip(ten_goi=ten, gia=gia, so_ngay=ngay, hang_id=tiers[ma].id))


async def init_loyalty_schema(engine: AsyncEngine) -> None:
    await create_tables(engine)
    await seed_defaults()