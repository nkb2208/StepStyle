"""Admin CRUD for `bienthesanpham` (product variants: size / color / stock)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from adminfeat.common import paginated, pagination
from adminfeat.config import get_settings
from adminfeat.db import get_session
from adminfeat.errors import bad_request, conflict, not_found
from adminfeat.models import BienTheSanPham, SanPham
from adminfeat.schemas import VariantCreate, VariantUpdate
from adminfeat.security import require_permission

router = APIRouter(prefix="/variants", tags=["variants"])

READ = [Depends(require_permission("product:read"))]
CREATE = [Depends(require_permission("product:create"))]
UPDATE = [Depends(require_permission("product:update"))]
DELETE = [Depends(require_permission("product:delete"))]


def to_dict(row: BienTheSanPham) -> dict[str, Any]:
    return {
        "id": row.ma_bien_the,
        "product_id": row.ma_san_pham,
        "size": row.kich_co,
        "color": row.mau_sac,
        "stock": row.so_luong_kho,
        "image": row.hinh_anh_bien_the,
    }


async def _get_or_404(session: AsyncSession, variant_id: int) -> BienTheSanPham:
    row = await session.get(BienTheSanPham, variant_id)
    if row is None:
        raise not_found("Product variant")
    return row


async def _assert_unique(
    session: AsyncSession,
    product_id: int,
    size: str,
    color: str,
    exclude_id: int | None = None,
) -> None:
    stmt = (
        select(func.count())
        .select_from(BienTheSanPham)
        .where(
            BienTheSanPham.ma_san_pham == product_id,
            BienTheSanPham.kich_co == size,
            BienTheSanPham.mau_sac == color,
        )
    )
    if exclude_id is not None:
        stmt = stmt.where(BienTheSanPham.ma_bien_the != exclude_id)
    if await session.scalar(stmt):
        raise conflict(
            "DUPLICATE_VARIANT",
            "This product already has a variant with the same size and color",
        )


@router.get("", dependencies=READ)
async def list_variants(
    session: AsyncSession = Depends(get_session),
    page_params: tuple[int, int, int] = Depends(pagination),
    product_id: int | None = Query(default=None),
    low_stock: bool = Query(
        default=False, description="Only variants at or below the low-stock threshold"
    ),
    max_stock: int | None = Query(default=None, ge=0),
    q: str | None = Query(default=None, description="Search by size or color"),
) -> dict[str, Any]:
    page, page_size, offset = page_params
    filters = []
    if product_id is not None:
        filters.append(BienTheSanPham.ma_san_pham == product_id)
    if low_stock:
        filters.append(BienTheSanPham.so_luong_kho <= get_settings().low_stock_threshold)
    if max_stock is not None:
        filters.append(BienTheSanPham.so_luong_kho <= max_stock)
    if q:
        needle = f"%{q.lower()}%"
        filters.append(
            func.lower(BienTheSanPham.kich_co).like(needle)
            | func.lower(BienTheSanPham.mau_sac).like(needle)
        )

    total = await session.scalar(select(func.count()).select_from(BienTheSanPham).where(*filters))
    rows = (
        await session.execute(
            select(BienTheSanPham)
            .where(*filters)
            .order_by(BienTheSanPham.ma_bien_the.desc())
            .offset(offset)
            .limit(page_size)
        )
    ).scalars()

    return paginated([to_dict(row) for row in rows], page, page_size, total or 0)


@router.post("", status_code=201, dependencies=CREATE)
async def create_variant(
    payload: VariantCreate,
    session: AsyncSession = Depends(get_session),
    product_id: int | None = Query(default=None),
) -> dict[str, Any]:
    if product_id is None:
        raise bad_request("MISSING_PRODUCT_ID", "product_id query parameter is required")
    if await session.get(SanPham, product_id) is None:
        raise not_found("Product")
    await _assert_unique(session, product_id, payload.size, payload.color)

    row = BienTheSanPham(
        ma_san_pham=product_id,
        kich_co=payload.size,
        mau_sac=payload.color,
        so_luong_kho=payload.stock,
        hinh_anh_bien_the=payload.image,
    )
    session.add(row)
    await session.flush()
    return {"variant": to_dict(row)}


@router.get("/{variant_id}", dependencies=READ)
async def get_variant(
    variant_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return {"variant": to_dict(await _get_or_404(session, variant_id))}


@router.patch("/{variant_id}", dependencies=UPDATE)
async def update_variant(
    variant_id: int,
    payload: VariantUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, variant_id)
    data = payload.model_dump(exclude_unset=True)

    new_size = data.get("size", row.kich_co)
    new_color = data.get("color", row.mau_sac)
    if "size" in data or "color" in data:
        await _assert_unique(session, row.ma_san_pham, new_size, new_color, exclude_id=variant_id)

    for attribute, column in (
        ("size", "kich_co"),
        ("color", "mau_sac"),
        ("stock", "so_luong_kho"),
        ("image", "hinh_anh_bien_the"),
    ):
        if attribute in data:
            setattr(row, column, data[attribute])

    await session.flush()
    return {"variant": to_dict(row)}


@router.delete("/{variant_id}", dependencies=DELETE)
async def delete_variant(
    variant_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, variant_id)
    await session.delete(row)
    await session.flush()
    return {"message": "Product variant deleted", "id": variant_id}
