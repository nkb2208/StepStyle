"""Aggregate statistics for the admin dashboard."""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from adminfeat.common import money
from adminfeat.config import get_settings
from adminfeat.db import get_session
from adminfeat.models import (
    BienTheSanPham,
    DanhMuc,
    DonHang,
    MagiamGia,
    NguoiDung,
    PhuongThucThanhToan,
    SanPham,
)
from adminfeat.routers.orders import to_dict as order_to_dict
from adminfeat.security import require_permission

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

READ = [Depends(require_permission("dashboard:read"))]


async def _count(session: AsyncSession, model, *filters) -> int:
    return await session.scalar(select(func.count()).select_from(model).where(*filters)) or 0


@router.get("/stats", dependencies=READ)
async def dashboard_stats(
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    settings = get_settings()
    threshold = settings.low_stock_threshold

    orders_by_status_rows = (
        await session.execute(
            select(DonHang.trang_thai_don_hang, func.count()).group_by(DonHang.trang_thai_don_hang)
        )
    ).all()
    orders_by_status = {status: count for status, count in orders_by_status_rows}
    for status in ("PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"):
        orders_by_status.setdefault(status, 0)

    revenue = await session.scalar(
        select(func.coalesce(func.sum(DonHang.tong_thanh_toan), 0)).where(
            DonHang.trang_thai_don_hang != "CANCELLED"
        )
    )
    month_ago = datetime.now() - timedelta(days=30)
    revenue_last_30_days = await session.scalar(
        select(func.coalesce(func.sum(DonHang.tong_thanh_toan), 0)).where(
            DonHang.trang_thai_don_hang != "CANCELLED",
            DonHang.ngay_dat >= month_ago,
        )
    )

    recent_orders = (
        await session.execute(select(DonHang).order_by(DonHang.ngay_dat.desc()).limit(5))
    ).scalars()

    low_stock = (
        await session.execute(
            select(BienTheSanPham)
            .where(BienTheSanPham.so_luong_kho <= threshold)
            .order_by(BienTheSanPham.so_luong_kho.asc())
            .limit(10)
        )
    ).scalars()

    return {
        "totals": {
            "products": await _count(session, SanPham),
            "active_products": await _count(session, SanPham, SanPham.trang_thai == "ACTIVE"),
            "categories": await _count(session, DanhMuc),
            "variants": await _count(session, BienTheSanPham),
            "users": await _count(session, NguoiDung),
            "active_users": await _count(session, NguoiDung, NguoiDung.trang_thai.is_(True)),
            "orders": await _count(session, DonHang),
            "discounts": await _count(session, MagiamGia, MagiamGia.kich_hoat.is_(True)),
            "payment_methods": await _count(session, PhuongThucThanhToan),
        },
        "orders_by_status": orders_by_status,
        "revenue": {
            "total": money(Decimal(revenue or 0)),
            "last_30_days": money(Decimal(revenue_last_30_days or 0)),
        },
        "low_stock": {
            "threshold": threshold,
            "count": await _count(
                session, BienTheSanPham, BienTheSanPham.so_luong_kho <= threshold
            ),
            "variants": [
                {
                    "id": variant.ma_bien_the,
                    "product_id": variant.ma_san_pham,
                    "size": variant.kich_co,
                    "color": variant.mau_sac,
                    "stock": variant.so_luong_kho,
                }
                for variant in low_stock
            ],
        },
        "recent_orders": [order_to_dict(order) for order in recent_orders],
        "generated_at": datetime.now(),
    }
