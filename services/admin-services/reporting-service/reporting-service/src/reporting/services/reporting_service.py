from __future__ import annotations

from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession

from reporting.repositories.reporting_repository import ReportingRepository
from reporting.schemas import (
    MonthlyStatsItem,
    MonthlyStatsOut,
    OrderStatusItem,
    OrderStatusStatsOut,
    OverviewStatsOut,
    PaymentMethodItem,
    PaymentMethodsOut,
    TopProductItem,
    TopProductsOut,
)

STATUS_LABELS: Dict[str, str] = {
    "PENDING": "Chờ xác nhận",
    "PROCESSING": "Đang xử lý",
    "SHIPPED": "Đang vận chuyển",
    "DELIVERED": "Đã giao thành công",
    "CANCELLED": "Đã bị hủy",
}


class ReportingService:
    def __init__(self, session: AsyncSession):
        self.repo = ReportingRepository(session)

    # Business Logic: Overview KPI
    async def get_overview(self, year: int) -> OverviewStatsOut:
        stats = await self.repo.get_overview_stats(year)
        monthly_data = await self.repo.get_monthly_revenue_stats(year)

        total_orders = stats.get("total_orders", 0) or 0
        cancelled_orders = stats.get("cancelled_orders", 0) or 0
        cancel_rate = round((cancelled_orders / total_orders * 100), 2) if total_orders > 0 else 0.0

        top_month_num = None
        top_month_revenue = 0.0
        for m in monthly_data:
            rev = float(m.get("revenue", 0.0) or 0.0)
            if rev > top_month_revenue:
                top_month_revenue = rev
                top_month_num = m.get("month")

        top_month_str = f"Tháng {top_month_num}" if top_month_num else "Chưa có dữ liệu"

        return OverviewStatsOut(
            year=year,
            total_revenue=float(stats.get("total_revenue", 0.0) or 0.0),
            total_orders=total_orders,
            average_order_value=float(stats.get("average_order_value", 0.0) or 0.0),
            successful_orders=stats.get("successful_orders", 0) or 0,
            cancelled_orders=cancelled_orders,
            cancel_rate=cancel_rate,
            top_month=top_month_str,
            top_month_revenue=top_month_revenue,
        )

    # Business Logic: Monthly Revenue
    async def get_monthly_revenue(self, year: int) -> MonthlyStatsOut:
        records = await self.repo.get_monthly_revenue_stats(year)
        record_map = {r["month"]: r for r in records}

        items: List[MonthlyStatsItem] = []
        for m in range(1, 13):
            data = record_map.get(m, {})
            rev = float(data.get("revenue", 0.0) or 0.0)
            orders = int(data.get("total_orders", 0) or 0)
            success = int(data.get("successful_orders", 0) or 0)
            cancel = int(data.get("cancelled_orders", 0) or 0)
            avg = round(rev / orders, 2) if orders > 0 else 0.0
            c_rate = round((cancel / orders * 100), 2) if orders > 0 else 0.0

            items.append(
                MonthlyStatsItem(
                    month=m,
                    month_label=f"Tháng {m}",
                    revenue=rev,
                    total_orders=orders,
                    successful_orders=success,
                    cancelled_orders=cancel,
                    average_value=avg,
                    cancel_rate=c_rate,
                )
            )

        return MonthlyStatsOut(year=year, items=items)

    # Business Logic: Order Status Stats
    async def get_order_status(self, year: int) -> OrderStatusStatsOut:
        records = await self.repo.get_order_status_stats(year)
        total_orders = sum(r["count"] for r in records)

        items: List[OrderStatusItem] = []
        for r in records:
            st = str(r["status"])
            cnt = int(r["count"])
            pct = round((cnt / total_orders * 100), 2) if total_orders > 0 else 0.0
            items.append(
                OrderStatusItem(
                    status=st,
                    label=STATUS_LABELS.get(st, st),
                    count=cnt,
                    percentage=pct,
                )
            )

        return OrderStatusStatsOut(year=year, total_orders=total_orders, items=items)

    # Business Logic: Top Selling Products
    async def get_top_products(self, limit: int, year: int) -> TopProductsOut:
        records = await self.repo.get_top_selling_products(limit, year)
        items = [
            TopProductItem(
                product_name=r["product_name"],
                total_sold=int(r["total_sold"] or 0),
                total_revenue=float(r["total_revenue"] or 0.0),
                image_url=r.get("image_url") or "",
            )
            for r in records
        ]
        return TopProductsOut(year=year, items=items)

    # Business Logic: Payment Methods
    async def get_payment_methods(self) -> PaymentMethodsOut:
        records = await self.repo.get_payment_method_stats()
        total_tx = sum(r["transaction_count"] for r in records)

        items: List[PaymentMethodItem] = []
        for r in records:
            tx_cnt = int(r["transaction_count"])
            pct = round((tx_cnt / total_tx * 100), 2) if total_tx > 0 else 0.0
            items.append(
                PaymentMethodItem(
                    payment_method=r["payment_method"],
                    transaction_count=tx_cnt,
                    total_amount=float(r["total_amount"] or 0.0),
                    percentage=pct,
                )
            )

        return PaymentMethodsOut(total_transactions=total_tx, items=items)
