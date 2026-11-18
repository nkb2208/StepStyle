"""Nghiệp vụ quản lý đơn hàng cho admin / nhân viên."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from order.errors import bad_request, conflict, not_found
from order.models import (
    ChiTietDonHang,
    DonHang,
    ThanhToan,
    TrangThaiDonHang,
    TrangThaiThanhToan,
)
from order.repositories.order_repository import OrderRepository
from order.schemas import (
    OrderCreate,
    OrderDetailOut,
    OrderItemOut,
    OrderListOut,
    OrderStatsOut,
    OrderSummaryOut,
    OrderUpdate,
    PaymentMethodOut,
    PaymentOut,
    VariantOptionOut,
)

# Chỉ được sửa thông tin giao hàng khi đơn chưa giao cho đơn vị vận chuyển.
EDITABLE_STATUSES = {"PENDING", "PROCESSING"}
# Chỉ được xóa đơn đã hủy (đơn đã giao / đang xử lý phải giữ để đối soát, báo cáo).
DELETABLE_STATUSES = {"CANCELLED"}

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
        co_the_sua=o.trang_thai in EDITABLE_STATUSES,
        co_the_xoa=o.trang_thai in DELETABLE_STATUSES,
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
            allowed = ALLOWED_TRANSITIONS.get(order.trang_thai, [])
            if new_status not in allowed:
                raise bad_request(
                    "INVALID_TRANSITION",
                    f"Không thể chuyển đơn từ {order.trang_thai} sang {new_status}",
                )
            order.trang_thai = new_status
            await self._repo.flush()
        return await self._reload(order_id)

    async def update_payment_status(self, order_id: int, new_status: str) -> OrderDetailOut:
        order = await self._repo.get_by_id(order_id)
        if order is None:
            raise not_found("Đơn hàng")
        if not order.thanh_toan:
            raise not_found("Thanh toán của đơn hàng", code="PAYMENT_NOT_FOUND")
        payment = order.thanh_toan[-1]
        payment.trang_thai = new_status
        if new_status == TrangThaiThanhToan.SUCCESS.value and payment.ngay_thanh_toan is None:
            payment.ngay_thanh_toan = datetime.now()
        await self._repo.flush()
        return await self._reload(order_id)

    async def _reload(self, order_id: int) -> OrderDetailOut:
        order = await self._repo.get_by_id(order_id)
        await self._repo.session.refresh(order)  # lấy ngay_cap_nhat mới
        return _detail(order)

    # ── Tạo / sửa / xóa ──────────────────────────────────────────────────────

    async def create_order(self, data: OrderCreate) -> OrderDetailOut:
        if data.ma_nguoi_dung is not None and not await self._repo.user_exists(data.ma_nguoi_dung):
            raise bad_request("USER_NOT_FOUND", "Khách hàng không tồn tại")
        if data.ma_phuong_thuc is not None and not await self._repo.payment_method_exists(
            data.ma_phuong_thuc
        ):
            raise bad_request("PAYMENT_METHOD_NOT_FOUND", "Phương thức thanh toán không tồn tại")

        # Gộp các dòng trùng biến thể (bảng chitietdonhang có UNIQUE (đơn, biến thể)).
        qty_by_variant: dict[int, int] = {}
        for it in data.items:
            qty_by_variant[it.ma_bien_the] = qty_by_variant.get(it.ma_bien_the, 0) + it.so_luong

        variants = await self._repo.get_variants(list(qty_by_variant))
        items: list[ChiTietDonHang] = []
        subtotal = 0
        for variant_id, qty in qty_by_variant.items():
            v = variants.get(variant_id)
            if v is None:
                raise bad_request("VARIANT_NOT_FOUND", f"Biến thể sản phẩm #{variant_id} không tồn tại")
            product = v.san_pham
            if product.trang_thai != "ACTIVE":
                raise bad_request("PRODUCT_INACTIVE", f"Sản phẩm '{product.ten_san_pham}' đã ngừng bán")
            if qty > v.so_luong_kho:
                raise bad_request(
                    "OUT_OF_STOCK",
                    f"'{product.ten_san_pham}' ({v.kich_co}/{v.mau_sac}) chỉ còn {v.so_luong_kho} sản phẩm",
                )
            # Giá luôn lấy từ DB — không tin giá do client gửi lên.
            price = int(product.gia_khuyen_mai if product.gia_khuyen_mai is not None else product.gia_goc)
            subtotal += price * qty
            items.append(
                ChiTietDonHang(
                    ma_bien_the=variant_id,
                    ten_san_pham=product.ten_san_pham,
                    kich_co=v.kich_co,
                    mau_sac=v.mau_sac,
                    so_luong=qty,
                    don_gia=price,
                )
            )

        if data.tien_giam_gia > subtotal:
            raise bad_request("DISCOUNT_TOO_HIGH", "Tiền giảm giá không được lớn hơn tiền hàng")
        total = subtotal - data.tien_giam_gia + data.phi_van_chuyen

        order = DonHang(
            ma_nguoi_dung=data.ma_nguoi_dung,
            ten_nguoi_nhan=data.ten_nguoi_nhan,
            so_dien_thoai_nhan=data.so_dien_thoai_nhan,
            dia_chi_giao_hang=data.dia_chi_giao_hang,
            tong_tien_hang=subtotal,
            tien_giam_gia=data.tien_giam_gia,
            phi_van_chuyen=data.phi_van_chuyen,
            tong_thanh_toan=total,
            trang_thai=TrangThaiDonHang.PENDING.value,
            ghi_chu=data.ghi_chu,
            items=items,
            thanh_toan=(
                [
                    ThanhToan(
                        ma_phuong_thuc=data.ma_phuong_thuc,
                        so_tien=total,
                        trang_thai=TrangThaiThanhToan.PENDING.value,
                    )
                ]
                if data.ma_phuong_thuc is not None
                else []
            ),
        )
        self._repo.add(order)
        await self._repo.flush()
        return await self._reload(order.id)

    async def update_order(self, order_id: int, data: OrderUpdate) -> OrderDetailOut:
        order = await self._repo.get_by_id(order_id)
        if order is None:
            raise not_found("Đơn hàng")
        if order.trang_thai not in EDITABLE_STATUSES:
            raise bad_request(
                "ORDER_LOCKED",
                f"Không thể sửa đơn ở trạng thái {order.trang_thai}",
            )
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(order, field, value)
        await self._repo.flush()
        return await self._reload(order_id)

    async def delete_order(self, order_id: int) -> None:
        order = await self._repo.get_by_id(order_id)
        if order is None:
            raise not_found("Đơn hàng")
        if order.trang_thai not in DELETABLE_STATUSES:
            raise bad_request(
                "ORDER_NOT_DELETABLE",
                "Chỉ được xóa đơn đã hủy. Hãy hủy đơn trước nếu muốn xóa.",
            )
        await self._repo.delete(order)

    # ── Dữ liệu phụ trợ cho form tạo đơn ─────────────────────────────────────

    async def list_variant_options(self, search: str | None, limit: int) -> list[VariantOptionOut]:
        return [
            VariantOptionOut(
                ma_bien_the=v.id,
                ten_san_pham=v.san_pham.ten_san_pham,
                kich_co=v.kich_co,
                mau_sac=v.mau_sac,
                don_gia=int(
                    v.san_pham.gia_khuyen_mai
                    if v.san_pham.gia_khuyen_mai is not None
                    else v.san_pham.gia_goc
                ),
                so_luong_kho=v.so_luong_kho,
            )
            for v in await self._repo.list_variants(search, limit)
        ]

    async def list_payment_methods(self) -> list[PaymentMethodOut]:
        return [
            PaymentMethodOut(ma_phuong_thuc=m.id, ten_phuong_thuc=m.ten_phuong_thuc)
            for m in await self._repo.list_payment_methods()
        ]
