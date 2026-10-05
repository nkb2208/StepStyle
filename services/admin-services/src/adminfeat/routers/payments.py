"""Admin CRUD for `thanhtoan` (payment records of an order)."""

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
from adminfeat.models import DonHang, PhuongThucThanhToan, ThanhToan
from adminfeat.schemas import PaymentCreate, PaymentUpdate
from adminfeat.security import require_permission

router = APIRouter(prefix="/payments", tags=["payments"])

READ = [Depends(require_permission("payment:read"))]
CREATE = [Depends(require_permission("payment:create"))]
UPDATE = [Depends(require_permission("payment:update"))]
DELETE = [Depends(require_permission("payment:delete"))]

SETTLED_STATUSES = {"SUCCESS", "FAILED", "REFUNDED"}


def to_dict(row: ThanhToan) -> dict[str, Any]:
    return {
        "id": row.ma_thanh_toan,
        "order_id": row.ma_don_hang,
        "method_id": row.ma_phuong_thuc,
        "amount": money(row.so_tien),
        "status": row.trang_thai_thanh_toan,
        "gateway_txn_id": row.ma_giao_dich_cong,
        "created_at": row.ngay_tao,
        "paid_at": row.ngay_thanh_toan,
    }


async def _get_or_404(session: AsyncSession, payment_id: int) -> ThanhToan:
    row = await session.get(ThanhToan, payment_id)
    if row is None:
        raise not_found("Payment")
    return row


async def _ensure_refs(session: AsyncSession, order_id: int, method_id: int | None) -> None:
    if await session.get(DonHang, order_id) is None:
        raise bad_request("INVALID_ORDER", f"Order {order_id} does not exist")
    if method_id is not None and await session.get(PhuongThucThanhToan, method_id) is None:
        raise bad_request("INVALID_PAYMENT_METHOD", f"Payment method {method_id} does not exist")


async def _assert_txn_unique(
    session: AsyncSession, method_id: int | None, txn_id: str | None, exclude_id: int | None = None
) -> None:
    """`uq_thanhtoan_giaodich` — unique (method, gateway transaction id)."""
    if method_id is None or not txn_id:
        return
    stmt = (
        select(func.count())
        .select_from(ThanhToan)
        .where(
            ThanhToan.ma_phuong_thuc == method_id,
            ThanhToan.ma_giao_dich_cong == txn_id,
        )
    )
    if exclude_id is not None:
        stmt = stmt.where(ThanhToan.ma_thanh_toan != exclude_id)
    if await session.scalar(stmt):
        raise conflict(
            "DUPLICATE_TRANSACTION",
            "A payment with this method and gateway transaction id already exists",
        )


@router.get("", dependencies=READ)
async def list_payments(
    session: AsyncSession = Depends(get_session),
    page_params: tuple[int, int, int] = Depends(pagination),
    order_id: int | None = Query(default=None),
    method_id: int | None = Query(default=None),
    status: str | None = Query(default=None, pattern="^(PENDING|SUCCESS|FAILED|REFUNDED)$"),
) -> dict[str, Any]:
    page, page_size, offset = page_params
    filters = []
    if order_id is not None:
        filters.append(ThanhToan.ma_don_hang == order_id)
    if method_id is not None:
        filters.append(ThanhToan.ma_phuong_thuc == method_id)
    if status:
        filters.append(ThanhToan.trang_thai_thanh_toan == status)

    total = await session.scalar(select(func.count()).select_from(ThanhToan).where(*filters))
    rows = (
        await session.execute(
            select(ThanhToan)
            .where(*filters)
            .order_by(ThanhToan.ma_thanh_toan.desc())
            .offset(offset)
            .limit(page_size)
        )
    ).scalars()
    return paginated([to_dict(row) for row in rows], page, page_size, total or 0)


@router.post("", status_code=201, dependencies=CREATE)
async def create_payment(
    payload: PaymentCreate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await _ensure_refs(session, payload.order_id, payload.method_id)
    await _assert_txn_unique(session, payload.method_id, payload.gateway_txn_id)

    status = payload.status.value
    row = ThanhToan(
        ma_don_hang=payload.order_id,
        ma_phuong_thuc=payload.method_id,
        so_tien=Decimal(payload.amount),
        trang_thai_thanh_toan=status,
        ma_giao_dich_cong=payload.gateway_txn_id,
        ngay_thanh_toan=datetime.now() if status in SETTLED_STATUSES else None,
    )
    session.add(row)
    await session.flush()
    return {"payment": to_dict(row)}


@router.get("/{payment_id}", dependencies=READ)
async def get_payment(
    payment_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return {"payment": to_dict(await _get_or_404(session, payment_id))}


@router.patch("/{payment_id}", dependencies=UPDATE)
async def update_payment(
    payment_id: int,
    payload: PaymentUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, payment_id)
    data = payload.model_dump(exclude_unset=True)

    if "method_id" in data or "gateway_txn_id" in data:
        method_id = data.get("method_id", row.ma_phuong_thuc)
        txn_id = data.get("gateway_txn_id", row.ma_giao_dich_cong)
        await _ensure_refs(session, row.ma_don_hang, method_id)
        await _assert_txn_unique(session, method_id, txn_id, exclude_id=payment_id)

    if "method_id" in data:
        row.ma_phuong_thuc = data["method_id"]
    if "amount" in data:
        row.so_tien = Decimal(data["amount"])
    if "gateway_txn_id" in data:
        row.ma_giao_dich_cong = data["gateway_txn_id"]
    if "status" in data:
        row.trang_thai_thanh_toan = data["status"].value
        row.ngay_thanh_toan = datetime.now() if data["status"].value in SETTLED_STATUSES else None

    await session.flush()
    return {"payment": to_dict(row)}


@router.delete("/{payment_id}", dependencies=DELETE)
async def delete_payment(
    payment_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, payment_id)
    await session.delete(row)
    await session.flush()
    return {"message": "Payment deleted", "id": payment_id}
