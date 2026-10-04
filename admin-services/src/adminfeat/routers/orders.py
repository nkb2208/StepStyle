"""Admin CRUD for `donhang` + `chitietdonhang` (orders and their snapshots)."""

from __future__ import annotations

from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from adminfeat.common import money, paginated, pagination
from adminfeat.db import get_session
from adminfeat.errors import bad_request, conflict, not_found
from adminfeat.models import (
    BienTheSanPham,
    ChiTietDonHang,
    DonHang,
    MagiamGia,
    NguoiDung,
    SanPham,
    ThanhToan,
)
from adminfeat.routers.payments import to_dict as payment_to_dict
from adminfeat.schemas import OrderCreate, OrderStatusUpdate, OrderUpdate
from adminfeat.security import require_permission

router = APIRouter(prefix="/orders", tags=["orders"])

READ = [Depends(require_permission("order:read"))]
CREATE = [Depends(require_permission("order:create"))]
UPDATE = [Depends(require_permission("order:update"))]
DELETE = [Depends(require_permission("order:delete"))]

# Allowed state machine of `donhang.trang_thai_don_hang`.
TRANSITIONS: dict[str, set[str]] = {
    "PENDING": {"PROCESSING", "CANCELLED"},
    "PROCESSING": {"SHIPPED", "CANCELLED"},
    "SHIPPED": {"DELIVERED"},
    "DELIVERED": set(),
    "CANCELLED": set(),
}


def to_dict(row: DonHang, customer_name: str | None = None) -> dict[str, Any]:
    return {
        "id": row.ma_don_hang,
        "customer_id": row.ma_nguoi_dung,
        "customer_name": customer_name,
        "recipient_name": row.ten_nguoi_nhan,
        "phone": row.so_dien_thoai_nhan,
        "address": row.dia_chi_giao_hang,
        "subtotal": money(row.tong_tien_hang),
        "discount_amount": money(row.tien_giam_gia),
        "shipping_fee": money(row.phi_van_chuyen),
        "total": money(row.tong_thanh_toan),
        "status": row.trang_thai_don_hang,
        "discount_id": row.ma_giam_gia,
        "note": row.ghi_chu,
        "created_at": row.ngay_dat,
        "updated_at": row.ngay_cap_nhat,
    }


def item_to_dict(row: ChiTietDonHang) -> dict[str, Any]:
    return {
        "id": row.ma_chi_tiet,
        "order_id": row.ma_don_hang,
        "variant_id": row.ma_bien_the,
        "product_name": row.ten_san_pham,
        "size": row.kich_co,
        "color": row.mau_sac,
        "quantity": row.so_luong,
        "unit_price": money(row.don_gia),
        "line_total": money(row.don_gia * row.so_luong),
    }


async def _get_or_404(session: AsyncSession, order_id: int) -> DonHang:
    row = await session.get(DonHang, order_id)
    if row is None:
        raise not_found("Order")
    return row


def _quantize(value: Decimal) -> Decimal:
    return value.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def _recompute_total(row: DonHang) -> None:
    """Keep `chk_dh_tong` satisfied: total = subtotal - discount + shipping."""
    row.tong_thanh_toan = (
        Decimal(row.tong_tien_hang) - Decimal(row.tien_giam_gia) + Decimal(row.phi_van_chuyen)
    )


async def _apply_discount(
    session: AsyncSession, discount_id: int, subtotal: Decimal
) -> tuple[MagiamGia, Decimal]:
    discount = await session.get(MagiamGia, discount_id)
    if discount is None:
        raise bad_request("INVALID_DISCOUNT", f"Discount {discount_id} does not exist")
    if not discount.kich_hoat:
        raise bad_request("DISCOUNT_INACTIVE", "This discount code is disabled")

    now = datetime.now()
    if discount.ngay_bat_dau and now < discount.ngay_bat_dau:
        raise bad_request("DISCOUNT_NOT_STARTED", "This discount code is not active yet")
    if discount.ngay_ket_thuc and now > discount.ngay_ket_thuc:
        raise bad_request("DISCOUNT_EXPIRED", "This discount code has expired")
    if discount.so_luong_da_dung >= discount.so_luong:
        raise bad_request("DISCOUNT_EXHAUSTED", "This discount code has no uses left")
    if subtotal < Decimal(discount.gia_tri_toi_thieu):
        raise bad_request(
            "DISCOUNT_MIN_ORDER",
            f"Order subtotal must be at least {money(discount.gia_tri_toi_thieu)}",
        )

    if discount.loai_giam_gia == "PERCENT":
        amount = _quantize(subtotal * Decimal(discount.gia_tri_giam) / Decimal(100))
    else:
        amount = Decimal(discount.gia_tri_giam)
    if discount.gia_tri_giam_toi_da is not None:
        amount = min(amount, Decimal(discount.gia_tri_giam_toi_da))
    return discount, min(amount, subtotal)


@router.get("", dependencies=READ)
async def list_orders(
    session: AsyncSession = Depends(get_session),
    page_params: tuple[int, int, int] = Depends(pagination),
    status: str | None = Query(
        default=None, pattern="^(PENDING|PROCESSING|SHIPPED|DELIVERED|CANCELLED)$"
    ),
    customer_id: int | None = Query(default=None),
    discount_id: int | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    min_total: int | None = Query(default=None, ge=0),
    sort: str = Query(default="newest", pattern="^(newest|oldest|total_asc|total_desc)$"),
) -> dict[str, Any]:
    page, page_size, offset = page_params
    filters = []
    if status:
        filters.append(DonHang.trang_thai_don_hang == status)
    if customer_id is not None:
        filters.append(DonHang.ma_nguoi_dung == customer_id)
    if discount_id is not None:
        filters.append(DonHang.ma_giam_gia == discount_id)
    if from_date is not None:
        filters.append(DonHang.ngay_dat >= from_date)
    if to_date is not None:
        filters.append(DonHang.ngay_dat <= to_date)
    if min_total is not None:
        filters.append(DonHang.tong_thanh_toan >= min_total)

    orders_sort = {
        "newest": DonHang.ngay_dat.desc(),
        "oldest": DonHang.ngay_dat.asc(),
        "total_asc": DonHang.tong_thanh_toan.asc(),
        "total_desc": DonHang.tong_thanh_toan.desc(),
    }[sort]

    total = await session.scalar(select(func.count()).select_from(DonHang).where(*filters))
    rows = (
        await session.execute(
            select(DonHang, NguoiDung.ho_ten)
            .outerjoin(NguoiDung, DonHang.ma_nguoi_dung == NguoiDung.ma_nguoi_dung)
            .where(*filters)
            .order_by(orders_sort)
            .offset(offset)
            .limit(page_size)
        )
    ).all()
    items = [to_dict(row, customer_name=name) for row, name in rows]
    return paginated(items, page, page_size, total or 0)


@router.post("", status_code=201, dependencies=CREATE)
async def create_order(
    payload: OrderCreate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    customer_id = payload.customer_id
    if customer_id is not None and await session.get(NguoiDung, customer_id) is None:
        raise bad_request("INVALID_CUSTOMER", f"Customer {customer_id} does not exist")

    # ── Resolve variants, prices and stock ─────────────────────────────────
    variant_ids = [item.variant_id for item in payload.items]
    pairs = (
        await session.execute(
            select(BienTheSanPham, SanPham)
            .join(SanPham, BienTheSanPham.ma_san_pham == SanPham.ma_san_pham)
            .where(BienTheSanPham.ma_bien_the.in_(variant_ids))
        )
    ).all()
    variants = {variant.ma_bien_the: (variant, product) for variant, product in pairs}

    lines: list[tuple[BienTheSanPham, SanPham, int, Decimal]] = []
    subtotal = Decimal(0)
    for item in payload.items:
        pair = variants.get(item.variant_id)
        if pair is None:
            raise not_found(f"Product variant {item.variant_id}")
        variant, product = pair
        if variant.so_luong_kho < item.quantity:
            raise conflict(
                "INSUFFICIENT_STOCK",
                f"Variant {variant.ma_bien_the} has only {variant.so_luong_kho} units in stock",
            )
        unit_price = Decimal(product.gia_khuyen_mai or product.gia_goc)
        lines.append((variant, product, item.quantity, unit_price))
        subtotal += unit_price * item.quantity

    # ── Discount ───────────────────────────────────────────────────────────
    discount_amount = Decimal(0)
    if payload.discount_id is not None:
        _, discount_amount = await _apply_discount(session, payload.discount_id, subtotal)

    total = subtotal - discount_amount + Decimal(payload.shipping_fee)

    order = DonHang(
        ma_nguoi_dung=payload.customer_id,
        ten_nguoi_nhan=payload.recipient_name,
        so_dien_thoai_nhan=payload.phone,
        dia_chi_giao_hang=payload.address,
        tong_tien_hang=subtotal,
        tien_giam_gia=discount_amount,
        phi_van_chuyen=Decimal(payload.shipping_fee),
        tong_thanh_toan=total,
        trang_thai_don_hang="PENDING",
        ma_giam_gia=payload.discount_id,
        ghi_chu=payload.note,
    )
    session.add(order)
    await session.flush()

    for variant, product, quantity, unit_price in lines:
        session.add(
            ChiTietDonHang(
                ma_don_hang=order.ma_don_hang,
                ma_bien_the=variant.ma_bien_the,
                ten_san_pham=product.ten_san_pham,
                kich_co=variant.kich_co,
                mau_sac=variant.mau_sac,
                so_luong=quantity,
                don_gia=unit_price,
            )
        )
        variant.so_luong_kho -= quantity

    if payload.discount_id is not None:
        discount = await session.get(MagiamGia, payload.discount_id)
        if discount is not None:
            discount.so_luong_da_dung += 1

    await session.flush()
    return {"order": to_dict(order)}


@router.get("/{order_id}", dependencies=READ)
async def get_order(
    order_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, order_id)
    customer_name = None
    if row.ma_nguoi_dung:
        customer_name = await session.scalar(
            select(NguoiDung.ho_ten).where(NguoiDung.ma_nguoi_dung == row.ma_nguoi_dung)
        )
    items = (
        await session.execute(
            select(ChiTietDonHang)
            .where(ChiTietDonHang.ma_don_hang == order_id)
            .order_by(ChiTietDonHang.ma_chi_tiet)
        )
    ).scalars()

    payments = (
        await session.execute(
            select(ThanhToan)
            .where(ThanhToan.ma_don_hang == order_id)
            .order_by(ThanhToan.ma_thanh_toan)
        )
    ).scalars()

    return {
        "order": to_dict(row, customer_name=customer_name),
        "items": [item_to_dict(item) for item in items],
        "payments": [payment_to_dict(payment) for payment in payments],
    }


@router.patch("/{order_id}", dependencies=UPDATE)
async def update_order(
    order_id: int,
    payload: OrderUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, order_id)
    if row.trang_thai_don_hang in ("DELIVERED", "CANCELLED"):
        raise conflict(
            "ORDER_CLOSED", f"An order in status {row.trang_thai_don_hang} can no longer be edited"
        )

    data = payload.model_dump(exclude_unset=True)
    if "recipient_name" in data:
        row.ten_nguoi_nhan = data["recipient_name"]
    if "phone" in data:
        row.so_dien_thoai_nhan = data["phone"]
    if "address" in data:
        row.dia_chi_giao_hang = data["address"]
    if "note" in data:
        row.ghi_chu = data["note"]
    if "shipping_fee" in data:
        row.phi_van_chuyen = Decimal(data["shipping_fee"])
        _recompute_total(row)

    await session.flush()
    return {"order": to_dict(row)}


@router.patch("/{order_id}/status", dependencies=UPDATE)
async def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, order_id)
    target = payload.status.value

    if target == row.trang_thai_don_hang:
        return {"order": to_dict(row)}

    allowed = TRANSITIONS.get(row.trang_thai_don_hang, set())
    if target not in allowed:
        raise bad_request(
            "INVALID_TRANSITION",
            f"Cannot move an order from {row.trang_thai_don_hang} to {target}",
        )

    if target == "CANCELLED":
        await _restore_stock_and_discount(session, row)

    row.trang_thai_don_hang = target
    await session.flush()
    return {"order": to_dict(row)}


async def _restore_stock_and_discount(session: AsyncSession, order: DonHang) -> None:
    """Cancelling gives the reserved units back and frees the discount use."""
    items = (
        await session.execute(
            select(ChiTietDonHang).where(ChiTietDonHang.ma_don_hang == order.ma_don_hang)
        )
    ).scalars()
    for item in items:
        variant = await session.get(BienTheSanPham, item.ma_bien_the)
        if variant is not None:
            variant.so_luong_kho += item.so_luong

    if order.ma_giam_gia is not None:
        discount = await session.get(MagiamGia, order.ma_giam_gia)
        if discount is not None and discount.so_luong_da_dung > 0:
            discount.so_luong_da_dung -= 1


@router.delete("/{order_id}", dependencies=DELETE)
async def delete_order(
    order_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, order_id)
    await session.delete(row)
    await session.flush()
    return {"message": "Order deleted", "id": order_id}
