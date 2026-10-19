"""REST endpoints /orders — dành cho ADMIN / SELLER."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from order.db import get_session
from order.schemas import (
    OrderDetailOut,
    OrderListOut,
    OrderStatsOut,
    OrderStatusUpdate,
    PaymentStatusUpdate,
)
from order.security import CurrentUser, require_staff
from order.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])


def get_service(session: AsyncSession = Depends(get_session)) -> OrderService:
    return OrderService(session)


@router.get("", response_model=OrderListOut, summary="Danh sách đơn hàng")
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None, description="Lọc theo trạng thái đơn"),
    search: str | None = Query(None, max_length=100, description="Mã đơn / tên / SĐT người nhận"),
    date_from: date | None = None,
    date_to: date | None = None,
    _user: CurrentUser = Depends(require_staff),
    svc: OrderService = Depends(get_service),
) -> OrderListOut:
    return await svc.list_orders(
        page=page,
        page_size=page_size,
        status=status,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )


# Phải khai báo TRƯỚC "/{order_id}" để "stats" không bị hiểu là một ID.
@router.get("/stats", response_model=OrderStatsOut, summary="Đếm đơn theo trạng thái")
async def order_stats(
    _user: CurrentUser = Depends(require_staff),
    svc: OrderService = Depends(get_service),
) -> OrderStatsOut:
    return await svc.stats()


@router.get("/{order_id}", response_model=OrderDetailOut, summary="Chi tiết đơn hàng")
async def get_order(
    order_id: int,
    _user: CurrentUser = Depends(require_staff),
    svc: OrderService = Depends(get_service),
) -> OrderDetailOut:
    return await svc.get_order(order_id)


@router.patch("/{order_id}/status", response_model=OrderDetailOut, summary="Cập nhật trạng thái đơn")
async def update_order_status(
    order_id: int,
    body: OrderStatusUpdate,
    _user: CurrentUser = Depends(require_staff),
    svc: OrderService = Depends(get_service),
) -> OrderDetailOut:
    return await svc.update_status(order_id, body.trang_thai)


@router.patch(
    "/{order_id}/payment", response_model=OrderDetailOut, summary="Cập nhật trạng thái thanh toán"
)
async def update_payment_status(
    order_id: int,
    body: PaymentStatusUpdate,
    _user: CurrentUser = Depends(require_staff),
    svc: OrderService = Depends(get_service),
) -> OrderDetailOut:
    return await svc.update_payment_status(order_id, body.trang_thai_thanh_toan)
