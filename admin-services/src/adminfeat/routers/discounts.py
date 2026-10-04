"""Admin CRUD for `magiamgia` (discount codes)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from adminfeat.common import money, paginated, pagination
from adminfeat.db import get_session
from adminfeat.errors import bad_request, conflict, not_found
from adminfeat.models import MagiamGia
from adminfeat.schemas import DiscountCreate, DiscountUpdate
from adminfeat.security import require_permission

router = APIRouter(prefix="/discounts", tags=["discounts"])

READ = [Depends(require_permission("discount:read"))]
CREATE = [Depends(require_permission("discount:create"))]
UPDATE = [Depends(require_permission("discount:update"))]
DELETE = [Depends(require_permission("discount:delete"))]


def to_dict(row: MagiamGia) -> dict[str, Any]:
    return {
        "id": row.ma_giam_gia,
        "code": row.code_giam_gia,
        "type": row.loai_giam_gia,
        "value": money(row.gia_tri_giam),
        "min_order_value": money(row.gia_tri_toi_thieu),
        "max_discount": money(row.gia_tri_giam_toi_da),
        "quantity": row.so_luong,
        "used_quantity": row.so_luong_da_dung,
        "remaining_quantity": max(row.so_luong - row.so_luong_da_dung, 0),
        "start_date": row.ngay_bat_dau,
        "end_date": row.ngay_ket_thuc,
        "active": row.kich_hoat,
    }


async def _get_or_404(session: AsyncSession, discount_id: int) -> MagiamGia:
    row = await session.get(MagiamGia, discount_id)
    if row is None:
        raise not_found("Discount")
    return row


async def _assert_code_unique(
    session: AsyncSession, code: str, exclude_id: int | None = None
) -> None:
    stmt = (
        select(func.count())
        .select_from(MagiamGia)
        .where(func.upper(MagiamGia.code_giam_gia) == code.upper())
    )
    if exclude_id is not None:
        stmt = stmt.where(MagiamGia.ma_giam_gia != exclude_id)
    if await session.scalar(stmt):
        raise conflict("DUPLICATE_CODE", f"Discount code '{code}' already exists")


def _assert_rules(
    discount_type: str, value: Decimal, start_date: datetime | None, end_date: datetime | None
) -> None:
    if discount_type == "PERCENT" and value > 100:
        raise bad_request("INVALID_DISCOUNT", "PERCENT discount value cannot exceed 100")
    if start_date is not None and end_date is not None and end_date <= start_date:
        raise bad_request("INVALID_PERIOD", "end_date must be after start_date")


@router.get("", dependencies=READ)
async def list_discounts(
    session: AsyncSession = Depends(get_session),
    page_params: tuple[int, int, int] = Depends(pagination),
    active: bool | None = Query(default=None),
    q: str | None = Query(default=None, description="Search by code"),
    available: bool = Query(
        default=False, description="Only codes that can still be used right now"
    ),
) -> dict[str, Any]:
    page, page_size, offset = page_params
    filters = []
    if active is not None:
        filters.append(MagiamGia.kich_hoat.is_(active))
    if q:
        filters.append(func.upper(MagiamGia.code_giam_gia).like(f"%{q.upper()}%"))
    if available:
        filters.extend(
            [
                MagiamGia.kich_hoat.is_(True),
                MagiamGia.so_luong_da_dung < MagiamGia.so_luong,
            ]
        )

    total = await session.scalar(select(func.count()).select_from(MagiamGia).where(*filters))
    rows = (
        await session.execute(
            select(MagiamGia)
            .where(*filters)
            .order_by(MagiamGia.ma_giam_gia.desc())
            .offset(offset)
            .limit(page_size)
        )
    ).scalars()
    return paginated([to_dict(row) for row in rows], page, page_size, total or 0)


@router.post("", status_code=201, dependencies=CREATE)
async def create_discount(
    payload: DiscountCreate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await _assert_code_unique(session, payload.code)
    row = MagiamGia(
        code_giam_gia=payload.code.upper(),
        loai_giam_gia=payload.type.value,
        gia_tri_giam=payload.value,
        gia_tri_toi_thieu=payload.min_order_value,
        gia_tri_giam_toi_da=payload.max_discount,
        so_luong=payload.quantity,
        ngay_bat_dau=payload.start_date,
        ngay_ket_thuc=payload.end_date,
        kich_hoat=payload.active,
    )
    session.add(row)
    await session.flush()
    return {"discount": to_dict(row)}


@router.get("/{discount_id}", dependencies=READ)
async def get_discount(
    discount_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return {"discount": to_dict(await _get_or_404(session, discount_id))}


@router.patch("/{discount_id}", dependencies=UPDATE)
async def update_discount(
    discount_id: int,
    payload: DiscountUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, discount_id)
    data = payload.model_dump(exclude_unset=True)

    if "code" in data:
        await _assert_code_unique(session, data["code"], exclude_id=discount_id)
        row.code_giam_gia = data["code"].upper()
    if "quantity" in data and data["quantity"] < row.so_luong_da_dung:
        raise bad_request(
            "QUANTITY_BELOW_USED",
            f"quantity cannot be lower than the {row.so_luong_da_dung} already used codes",
        )

    new_type = data.get("type", row.loai_giam_gia)
    new_value = data.get("value", row.gia_tri_giam)
    new_start = data.get("start_date", row.ngay_bat_dau)
    new_end = data.get("end_date", row.ngay_ket_thuc)
    _assert_rules(new_type, Decimal(new_value), new_start, new_end)

    column_map = {
        "type": "loai_giam_gia",
        "value": "gia_tri_giam",
        "min_order_value": "gia_tri_toi_thieu",
        "max_discount": "gia_tri_giam_toi_da",
        "quantity": "so_luong",
        "start_date": "ngay_bat_dau",
        "end_date": "ngay_ket_thuc",
        "active": "kich_hoat",
    }
    for attribute, column in column_map.items():
        if attribute in data:
            value = data[attribute]
            setattr(row, column, value.value if hasattr(value, "value") else value)

    await session.flush()
    return {"discount": to_dict(row)}


@router.delete("/{discount_id}", dependencies=DELETE)
async def delete_discount(
    discount_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, discount_id)
    await session.delete(row)
    await session.flush()
    return {"message": "Discount deleted", "id": discount_id}
