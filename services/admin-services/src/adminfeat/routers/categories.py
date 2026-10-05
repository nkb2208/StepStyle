"""Admin CRUD for `danhmuc` (product categories)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from adminfeat.common import paginated, pagination
from adminfeat.db import get_session
from adminfeat.errors import bad_request, not_found
from adminfeat.models import DanhMuc, SanPham
from adminfeat.schemas import CategoryCreate, CategoryUpdate
from adminfeat.security import require_permission

router = APIRouter(prefix="/categories", tags=["categories"])

READ = [Depends(require_permission("category:read"))]
CREATE = [Depends(require_permission("category:create"))]
UPDATE = [Depends(require_permission("category:update"))]
DELETE = [Depends(require_permission("category:delete"))]


def to_dict(row: DanhMuc, product_count: int = 0, child_count: int = 0) -> dict[str, Any]:
    return {
        "id": row.ma_danh_muc,
        "name": row.ten_danh_muc,
        "description": row.mo_ta,
        "parent_id": row.ma_danh_muc_cha,
        "product_count": product_count,
        "child_count": child_count,
    }


def _product_count_subquery():
    return (
        select(func.count())
        .select_from(SanPham)
        .where(SanPham.ma_danh_muc == DanhMuc.ma_danh_muc)
        .correlate(DanhMuc)
        .scalar_subquery()
    )


def _child_count_subquery():
    return (
        select(func.count())
        .select_from(DanhMuc)
        .where(DanhMuc.ma_danh_muc_cha == DanhMuc.ma_danh_muc)
        .correlate(DanhMuc)
        .scalar_subquery()
    )


async def _get_or_404(session: AsyncSession, category_id: int) -> DanhMuc:
    row = await session.get(DanhMuc, category_id)
    if row is None:
        raise not_found("Category")
    return row


async def _ensure_parent_exists(session: AsyncSession, parent_id: int | None) -> None:
    if parent_id is None:
        return
    if await session.get(DanhMuc, parent_id) is None:
        raise bad_request("INVALID_PARENT", f"Parent category {parent_id} does not exist")


@router.get("", dependencies=READ)
async def list_categories(
    session: AsyncSession = Depends(get_session),
    page_params: tuple[int, int, int] = Depends(pagination),
    parent_id: int | None = Query(default=None, description="Filter by parent category"),
    root_only: bool = Query(default=False, description="Only top-level categories"),
    q: str | None = Query(default=None, description="Case-insensitive name search"),
) -> dict[str, Any]:
    page, page_size, offset = page_params
    filters = []
    if parent_id is not None:
        filters.append(DanhMuc.ma_danh_muc_cha == parent_id)
    if root_only:
        filters.append(DanhMuc.ma_danh_muc_cha.is_(None))
    if q:
        filters.append(func.lower(DanhMuc.ten_danh_muc).like(f"%{q.lower()}%"))

    total = await session.scalar(select(func.count()).select_from(DanhMuc).where(*filters))
    rows = (
        await session.execute(
            select(
                DanhMuc,
                _product_count_subquery().label("product_count"),
                _child_count_subquery().label("child_count"),
            )
            .where(*filters)
            .order_by(DanhMuc.ma_danh_muc.desc())
            .offset(offset)
            .limit(page_size)
        )
    ).all()

    items = [to_dict(row, product_count=pc or 0, child_count=cc or 0) for row, pc, cc in rows]
    return paginated(items, page, page_size, total or 0)


@router.post("", status_code=201, dependencies=CREATE)
async def create_category(
    payload: CategoryCreate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await _ensure_parent_exists(session, payload.parent_id)
    row = DanhMuc(
        ten_danh_muc=payload.name,
        mo_ta=payload.description,
        ma_danh_muc_cha=payload.parent_id,
    )
    session.add(row)
    await session.flush()
    return {"category": to_dict(row)}


@router.get("/{category_id}", dependencies=READ)
async def get_category(
    category_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, category_id)
    product_count = await session.scalar(
        select(func.count()).select_from(SanPham).where(SanPham.ma_danh_muc == category_id)
    )
    child_count = await session.scalar(
        select(func.count()).select_from(DanhMuc).where(DanhMuc.ma_danh_muc_cha == category_id)
    )
    return {"category": to_dict(row, product_count or 0, child_count or 0)}


@router.patch("/{category_id}", dependencies=UPDATE)
async def update_category(
    category_id: int,
    payload: CategoryUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, category_id)
    data = payload.model_dump(exclude_unset=True)

    if "parent_id" in data:
        await _ensure_parent_exists(session, data["parent_id"])
        if data["parent_id"] is not None:
            await _assert_acyclic(session, category_id, data["parent_id"])
    if "name" in data:
        row.ten_danh_muc = data["name"]
    if "description" in data:
        row.mo_ta = data["description"]
    if "parent_id" in data:
        row.ma_danh_muc_cha = data["parent_id"]

    await session.flush()
    return {"category": to_dict(row)}


@router.delete("/{category_id}", dependencies=DELETE)
async def delete_category(
    category_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, category_id)
    await session.delete(row)
    await session.flush()
    return {"message": "Category deleted", "id": category_id}


async def _assert_acyclic(session: AsyncSession, category_id: int, new_parent_id: int) -> None:
    """Walk up from the prospective parent; hitting `category_id` means a cycle."""
    cursor: int | None = new_parent_id
    seen: set[int] = set()
    while cursor is not None:
        if cursor == category_id:
            raise bad_request("CYCLIC_CATEGORY", "Category hierarchy cannot contain a cycle")
        if cursor in seen:
            break
        seen.add(cursor)
        parent_row = await session.get(DanhMuc, cursor)
        cursor = parent_row.ma_danh_muc_cha if parent_row else None
