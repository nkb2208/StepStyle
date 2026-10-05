"""Admin CRUD for `phuongthucthanhtoan` (payment methods)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from adminfeat.common import paginated, pagination
from adminfeat.db import get_session
from adminfeat.errors import conflict, not_found
from adminfeat.models import PhuongThucThanhToan
from adminfeat.schemas import PaymentMethodCreate, PaymentMethodUpdate
from adminfeat.security import require_permission

router = APIRouter(prefix="/payment-methods", tags=["payment-methods"])

READ = [Depends(require_permission("payment_method:read"))]
CREATE = [Depends(require_permission("payment_method:create"))]
UPDATE = [Depends(require_permission("payment_method:update"))]
DELETE = [Depends(require_permission("payment_method:delete"))]


def to_dict(row: PhuongThucThanhToan) -> dict[str, Any]:
    return {
        "id": row.ma_phuong_thuc,
        "name": row.ten_phuong_thuc,
        "description": row.mo_ta,
        "active": row.kich_hoat,
    }


async def _get_or_404(session: AsyncSession, method_id: int) -> PhuongThucThanhToan:
    row = await session.get(PhuongThucThanhToan, method_id)
    if row is None:
        raise not_found("Payment method")
    return row


@router.get("", dependencies=READ)
async def list_payment_methods(
    session: AsyncSession = Depends(get_session),
    page_params: tuple[int, int, int] = Depends(pagination),
    active: bool | None = Query(default=None),
    q: str | None = Query(default=None),
) -> dict[str, Any]:
    page, page_size, offset = page_params
    filters = []
    if active is not None:
        filters.append(PhuongThucThanhToan.kich_hoat.is_(active))
    if q:
        filters.append(func.lower(PhuongThucThanhToan.ten_phuong_thuc).like(f"%{q.lower()}%"))

    total = await session.scalar(
        select(func.count()).select_from(PhuongThucThanhToan).where(*filters)
    )
    rows = (
        await session.execute(
            select(PhuongThucThanhToan)
            .where(*filters)
            .order_by(PhuongThucThanhToan.ma_phuong_thuc)
            .offset(offset)
            .limit(page_size)
        )
    ).scalars()
    return paginated([to_dict(row) for row in rows], page, page_size, total or 0)


@router.post("", status_code=201, dependencies=CREATE)
async def create_payment_method(
    payload: PaymentMethodCreate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    exists = await session.scalar(
        select(func.count())
        .select_from(PhuongThucThanhToan)
        .where(func.lower(PhuongThucThanhToan.ten_phuong_thuc) == payload.name.lower())
    )
    if exists:
        raise conflict(
            "DUPLICATE_PAYMENT_METHOD", f"Payment method '{payload.name}' already exists"
        )

    row = PhuongThucThanhToan(
        ten_phuong_thuc=payload.name,
        mo_ta=payload.description,
        kich_hoat=payload.active,
    )
    session.add(row)
    await session.flush()
    return {"payment_method": to_dict(row)}


@router.get("/{method_id}", dependencies=READ)
async def get_payment_method(
    method_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return {"payment_method": to_dict(await _get_or_404(session, method_id))}


@router.patch("/{method_id}", dependencies=UPDATE)
async def update_payment_method(
    method_id: int,
    payload: PaymentMethodUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, method_id)
    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"].lower() != row.ten_phuong_thuc.lower():
        duplicate = await session.scalar(
            select(func.count())
            .select_from(PhuongThucThanhToan)
            .where(
                func.lower(PhuongThucThanhToan.ten_phuong_thuc) == data["name"].lower(),
                PhuongThucThanhToan.ma_phuong_thuc != method_id,
            )
        )
        if duplicate:
            raise conflict(
                "DUPLICATE_PAYMENT_METHOD",
                f"Payment method '{data['name']}' already exists",
            )

    if "name" in data:
        row.ten_phuong_thuc = data["name"]
    if "description" in data:
        row.mo_ta = data["description"]
    if "active" in data:
        row.kich_hoat = data["active"]

    await session.flush()
    return {"payment_method": to_dict(row)}


@router.delete("/{method_id}", dependencies=DELETE)
async def delete_payment_method(
    method_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, method_id)
    await session.delete(row)
    await session.flush()
    return {"message": "Payment method deleted", "id": method_id}
