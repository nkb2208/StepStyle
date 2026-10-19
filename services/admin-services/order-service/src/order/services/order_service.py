"""Nghiệp vụ quản lý đơn hàng cho admin / nhân viên."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from order.errors import bad_request, not_found
from order.models import DonHang, ThanhToan, TrangThaiDonHang, TrangThaiThanhToan
from order.repositories.order_repository import OrderRepository
from order.schemas import (
    OrderDetailOut,
    OrderItemOut,
    OrderListOut,
    OrderStatsOut,
    OrderSummaryOut,
    PaymentOut,
)

# Luồng trạng thái hợp lệ. DELIVERED / CANCELLED là trạng thái cuối.
ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    "PENDING": ["PROCESSING", "CANCELLED"],
    "PROCESSING": ["SHIPPED", "CANCELLED"],
    "SHIPPED": ["DELIVERED"],
    "DELIVERED": [],
    "CANCELLED": [],
}


def _summary(o: DonHang) -> dict:
    latest_payment = o.thanh_toan[-1] if o.thanh_toan else None
    return {
        "id": o.id,
        "ma_nguoi_dung": o.ma_nguoi_dung,
        "ten_nguoi_nhan": o.ten_nguoi_nhan,
        "so_dien_thoai_nhan": o.so_dien_thoai_nhan,
        "email_khach": o.nguoi_dung.email if o.nguoi_dung else None,
        "tong_thanh_toan": o.tong_thanh_toan,
        "trang_thai": o.trang_thai,
        "phuong_thuc_thanh_toan": (
            latest_payment.phuong_thuc.ten_phuong_thuc
            if latest_payment and latest_payment.phuong_thuc
            else None
        ),
        "trang_thai_thanh_toan": latest_payment.trang_thai if latest_payment else None,
        "so_san_pham": sum(i.so_luong for i in o.items),
        "ngay_dat": o.ngay_dat,
    }


def _detail(o: DonHang) -> OrderDetailOut:
    return OrderDetailOut(
        **_summary(o),
        dia_chi_giao_hang=o.dia_chi_giao_hang,
        tong_tien_hang=o.tong_tien_hang,
        tien_giam_gia=o.tien_giam_gia,
        phi_van_chuyen=o.phi_van_chuyen,
        ghi_chu=o.ghi_chu,
        ngay_cap_nhat=o.ngay_cap_nhat,
        items=[
            OrderItemOut(
                id=i.id,
                ma_bien_the=i.ma_bien_the,
                ten_san_pham=i.ten_san_pham,
                kich_co=i.kich_co,
                mau_sac=i.mau_sac,
                so_luong=i.so_luong,
                don_gia=i.don_gia,
                thanh_tien=int(i.so_luong) * int(i.don_gia),
            )
            for i in o.items
        ],
        thanh_toan=[
            PaymentOut(
                id=p.id,
                phuong_thuc=p.phuong_thuc.ten_phuong_thuc if p.phuong_thuc else None,
                so_tien=p.so_tien,
                trang_thai=p.trang_thai,
                ma_giao_dich_cong=p.ma_giao_dich_cong,
                ngay_tao=p.ngay_tao,
                ngay_thanh_toan=p.ngay_thanh_toan,
            )
            for p in o.thanh_toan
        ],
        trang_thai_ke_tiep=ALLOWED_TRANSITIONS.get(o.trang_thai, []),
    )


class OrderService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = OrderRepository(session)

    async def list_orders(
        self,
        *,
        page: int,
        page_size: int,
        status: str | None,
        search: str | None,
        date_from: date | None,
        date_to: date | None,
    ) -> OrderListOut:
        status_norm = None
        if status:
            status_norm = status.upper().strip()
            if status_norm not in {s.value for s in TrangThaiDonHang}:
                raise bad_request("INVALID_STATUS", f"Trạng thái '{status}' không hợp lệ")
        if date_from and date_to and date_from > date_to:
            raise bad_request("INVALID_DATE_RANGE", "date_from phải nhỏ hơn hoặc bằng date_to")
        orders, total = await self._repo.list_orders(
            page=page,
            page_size=page_size,
            status=status_norm,
            search=search,
            date_from=date_from,
            date_to=date_to,
        )
        return OrderListOut(
            items=[OrderSummaryOut(**_summary(o)) for o in orders],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def stats(self) -> OrderStatsOut:
        counts = await self._repo.count_by_status()
        data = {s.lower(): counts.get(s, 0) for s in ALLOWED_TRANSITIONS}
        return OrderStatsOut(**data, total=sum(counts.values()))

    async def get_order(self, order_id: int) -> OrderDetailOut:
        order = await self._repo.get_by_id(order_id)
        if order is None:
            raise not_found("Đơn hàng")
        return _detail(order)

    async def update_status(self, order_id: int, new_status: str) -> OrderDetailOut:
        order = await self._repo.get_by_id(order_id)
        if order is None:
            raise not_found("Đơn hàng")
        if new_status != order.trang_thai:
            order.trang_thai = new_status
            await self._repo.flush()
        return await self._reload(order_id)

    async def update_payment_status(self, order_id: int, new_status: str) -> OrderDetailOut:
        order = await self._repo.get_by_id(order_id)
        if order is None:
            raise not_found("Đơn hàng")
        if not order.thanh_toan:
            payment = ThanhToan(
                ma_don_hang=order.id,
                so_tien=order.tong_thanh_toan,
                trang_thai=new_status,
                ngay_thanh_toan=datetime.now()
                if new_status == TrangThaiThanhToan.SUCCESS.value
                else None,
            )
            self._repo._session.add(payment)
        else:
            payment = order.thanh_toan[-1]
            payment.trang_thai = new_status
            if new_status == TrangThaiThanhToan.SUCCESS.value and payment.ngay_thanh_toan is None:
                payment.ngay_thanh_toan = datetime.now()
        await self._repo.flush()
        return await self._reload(order_id)

    async def _reload(self, order_id: int) -> OrderDetailOut:
        order = await self._repo.get_by_id(order_id)
        await self._repo._session.refresh(order)  # lấy ngay_cap_nhat mới
        return _detail(order)
