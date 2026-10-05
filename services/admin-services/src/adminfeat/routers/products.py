"""Admin CRUD for `sanpham` (products) incl. nested variant management."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from adminfeat.common import money, paginated, pagination
from adminfeat.db import get_session
from adminfeat.errors import bad_request, not_found
from adminfeat.models import BienTheSanPham, DanhMuc, ProductStatus, SanPham
from adminfeat.routers.variants import _assert_unique
from adminfeat.routers.variants import to_dict as variant_to_dict
from adminfeat.schemas import ProductCreate, ProductUpdate, VariantCreate
from adminfeat.security import require_permission

router = APIRouter(prefix="/products", tags=["products"])

READ = [Depends(require_permission("product:read"))]
CREATE = [Depends(require_permission("product:create"))]
UPDATE = [Depends(require_permission("product:update"))]
DELETE = [Depends(require_permission("product:delete"))]

SORTS = {
    "newest": (SanPham.ngay_tao.desc(),),
    "oldest": (SanPham.ngay_tao.asc(),),
    "price_asc": (SanPham.gia_goc.asc(),),
    "price_desc": (SanPham.gia_goc.desc(),),
    "name_asc": (SanPham.ten_san_pham.asc(),),
    "name_desc": (SanPham.ten_san_pham.desc(),),
}
SORT_PATTERN = f"^({'|'.join(SORTS)})$"


def to_dict(
    row: SanPham,
    *,
    category_name: str | None = None,
    variant_count: int = 0,
) -> dict[str, Any]:
    return {
        "id": row.ma_san_pham,
        "name": row.ten_san_pham,
        "original_price": money(row.gia_goc),
        "sale_price": money(row.gia_khuyen_mai),
        "description": row.mo_ta,
        "image": row.hinh_anh_dai_dien,
        "status": row.trang_thai,
        "category_id": row.ma_danh_muc,
        "category_name": category_name,
        "variant_count": variant_count,
        "created_at": row.ngay_tao,
        "updated_at": row.ngay_cap_nhat,
    }


async def _get_or_404(session: AsyncSession, product_id: int) -> SanPham:
    row = await session.get(SanPham, product_id)
    if row is None:
        raise not_found("Product")
    return row


async def _ensure_category(session: AsyncSession, category_id: int | None) -> None:
    if category_id is None:
        return
    if await session.get(DanhMuc, category_id) is None:
        raise bad_request("INVALID_CATEGORY", f"Category {category_id} does not exist")


def _assert_prices(original: Decimal, sale: Decimal | None) -> None:
    if sale is not None and sale > original:
        raise bad_request("INVALID_PRICE", "sale_price cannot be greater than original_price")


async def _variant_count(session: AsyncSession, product_id: int) -> int:
    return (
        await session.scalar(
            select(func.count())
            .select_from(BienTheSanPham)
            .where(BienTheSanPham.ma_san_pham == product_id)
        )
        or 0
    )


@router.get("", dependencies=READ)
async def list_products(
    session: AsyncSession = Depends(get_session),
    page_params: tuple[int, int, int] = Depends(pagination),
    category_id: int | None = Query(default=None),
    status: str | None = Query(default=None, pattern="^(ACTIVE|INACTIVE)$"),
    q: str | None = Query(default=None, description="Search by name"),
    min_price: int | None = Query(default=None, ge=0),
    max_price: int | None = Query(default=None, ge=0),
    sort: str = Query(default="newest", pattern=SORT_PATTERN),
) -> dict[str, Any]:
    page, page_size, offset = page_params

    variant_count = (
        select(func.count())
        .select_from(BienTheSanPham)
        .where(BienTheSanPham.ma_san_pham == SanPham.ma_san_pham)
        .correlate(SanPham)
        .scalar_subquery()
    )

    filters = []
    if category_id is not None:
        filters.append(SanPham.ma_danh_muc == category_id)
    if status:
        filters.append(SanPham.trang_thai == status)
    if q:
        filters.append(func.lower(SanPham.ten_san_pham).like(f"%{q.lower()}%"))
    if min_price is not None:
        filters.append(SanPham.gia_goc >= min_price)
    if max_price is not None:
        filters.append(SanPham.gia_goc <= max_price)

    total = await session.scalar(select(func.count()).select_from(SanPham).where(*filters))
    rows = (
        await session.execute(
            select(SanPham, DanhMuc.ten_danh_muc, variant_count.label("vc"))
            .outerjoin(DanhMuc, SanPham.ma_danh_muc == DanhMuc.ma_danh_muc)
            .where(*filters)
            .order_by(*SORTS[sort])
            .offset(offset)
            .limit(page_size)
        )
    ).all()

    items = [
        to_dict(row, category_name=category_name, variant_count=vc or 0)
        for row, category_name, vc in rows
    ]
    return paginated(items, page, page_size, total or 0)


@router.post("", status_code=201, dependencies=CREATE)
async def create_product(
    payload: ProductCreate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await _ensure_category(session, payload.category_id)
    row = SanPham(
        ten_san_pham=payload.name,
        gia_goc=payload.original_price,
        gia_khuyen_mai=payload.sale_price,
        mo_ta=payload.description,
        hinh_anh_dai_dien=payload.image,
        trang_thai=payload.status.value,
        ma_danh_muc=payload.category_id,
    )
    session.add(row)
    await session.flush()
    return {"product": to_dict(row)}


@router.get("/{product_id}", dependencies=READ)
async def get_product(
    product_id: int,
    session: AsyncSession = Depends(get_session),
    include_variants: bool = Query(default=True),
) -> dict[str, Any]:
    row = await _get_or_404(session, product_id)
    category_name = (
        await session.scalar(
            select(DanhMuc.ten_danh_muc).where(DanhMuc.ma_danh_muc == row.ma_danh_muc)
        )
        if row.ma_danh_muc
        else None
    )
    variants = []
    variant_count = 0
    if include_variants:
        variants = [
            variant_to_dict(variant)
            for variant in (
                await session.execute(
                    select(BienTheSanPham)
                    .where(BienTheSanPham.ma_san_pham == product_id)
                    .order_by(BienTheSanPham.ma_bien_the)
                )
            ).scalars()
        ]
    else:
        variant_count = await _variant_count(session, product_id)

    data = to_dict(
        row,
        category_name=category_name,
        variant_count=len(variants) if include_variants else variant_count,
    )
    if include_variants:
        data["variants"] = variants
    return {"product": data}


@router.patch("/{product_id}", dependencies=UPDATE)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, product_id)
    data = payload.model_dump(exclude_unset=True)

    if "category_id" in data:
        await _ensure_category(session, data["category_id"])

    if "sale_price" in data or "original_price" in data:
        original = data.get("original_price", row.gia_goc)
        sale = data.get("sale_price", row.gia_khuyen_mai)
        _assert_prices(Decimal(original), Decimal(sale) if sale is not None else None)

    column_map = {
        "name": "ten_san_pham",
        "original_price": "gia_goc",
        "sale_price": "gia_khuyen_mai",
        "description": "mo_ta",
        "image": "hinh_anh_dai_dien",
        "category_id": "ma_danh_muc",
    }
    for attribute, column in column_map.items():
        if attribute in data:
            setattr(row, column, data[attribute])
    if "status" in data:
        status = data["status"]
        row.trang_thai = status.value if isinstance(status, ProductStatus) else status

    await session.flush()
    return {"product": to_dict(row, variant_count=await _variant_count(session, product_id))}


@router.delete("/{product_id}", dependencies=DELETE)
async def delete_product(
    product_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, product_id)
    await session.delete(row)
    await session.flush()
    return {"message": "Product deleted", "id": product_id}


# ── Nested variants ─────────────────────────────────────────────────────────


@router.get("/{product_id}/variants", dependencies=READ)
async def list_product_variants(
    product_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await _get_or_404(session, product_id)
    rows = (
        await session.execute(
            select(BienTheSanPham)
            .where(BienTheSanPham.ma_san_pham == product_id)
            .order_by(BienTheSanPham.ma_bien_the)
        )
    ).scalars()
    return {"items": [variant_to_dict(row) for row in rows]}


@router.post("/{product_id}/variants", status_code=201, dependencies=CREATE)
async def create_product_variant(
    product_id: int,
    payload: VariantCreate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await _get_or_404(session, product_id)
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
    return {"variant": variant_to_dict(row)}
