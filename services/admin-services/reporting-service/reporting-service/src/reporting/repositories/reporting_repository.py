from __future__ import annotations

from typing import Any, Dict, List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class ReportingRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # Query: KPI Overview
    async def get_overview_stats(self, year: int) -> Dict[str, Any]:
        query = text(
            """
            SELECT 
                COALESCE(SUM(CASE WHEN trang_thai_don_hang != 'CANCELLED' THEN tong_thanh_toan ELSE 0 END), 0) AS total_revenue,
                COUNT(*) AS total_orders,
                COALESCE(AVG(CASE WHEN trang_thai_don_hang != 'CANCELLED' THEN tong_thanh_toan ELSE NULL END), 0) AS average_order_value,
                COUNT(CASE WHEN trang_thai_don_hang = 'DELIVERED' THEN 1 END) AS successful_orders,
                COUNT(CASE WHEN trang_thai_don_hang = 'CANCELLED' THEN 1 END) AS cancelled_orders
            FROM donhang
            WHERE YEAR(ngay_dat) = :year
            """
        )
        result = await self.session.execute(query, {"year": year})
        row = result.mappings().first()
        return dict(row) if row else {
            "total_revenue": 0.0,
            "total_orders": 0,
            "average_order_value": 0.0,
            "successful_orders": 0,
            "cancelled_orders": 0,
        }

    # Query: Monthly Revenue & Orders
    async def get_monthly_revenue_stats(self, year: int) -> List[Dict[str, Any]]:
        query = text(
            """
            SELECT 
                MONTH(ngay_dat) AS month,
                COALESCE(SUM(CASE WHEN trang_thai_don_hang != 'CANCELLED' THEN tong_thanh_toan ELSE 0 END), 0) AS revenue,
                COUNT(*) AS total_orders,
                COUNT(CASE WHEN trang_thai_don_hang = 'DELIVERED' THEN 1 END) AS successful_orders,
                COUNT(CASE WHEN trang_thai_don_hang = 'CANCELLED' THEN 1 END) AS cancelled_orders
            FROM donhang
            WHERE YEAR(ngay_dat) = :year
            GROUP BY MONTH(ngay_dat)
            ORDER BY MONTH(ngay_dat) ASC
            """
        )
        result = await self.session.execute(query, {"year": year})
        return [dict(row) for row in result.mappings().all()]

    # Query: Order Status Distribution
    async def get_order_status_stats(self, year: int) -> List[Dict[str, Any]]:
        query = text(
            """
            SELECT 
                trang_thai_don_hang AS status,
                COUNT(*) AS count
            FROM donhang
            WHERE YEAR(ngay_dat) = :year
            GROUP BY trang_thai_don_hang
            """
        )
        result = await self.session.execute(query, {"year": year})
        return [dict(row) for row in result.mappings().all()]

    # Query: Top Selling Products
    async def get_top_selling_products(self, limit: int, year: int) -> List[Dict[str, Any]]:
        query = text(
            """
            SELECT 
                ct.ten_san_pham AS product_name,
                CAST(SUM(ct.so_luong) AS SIGNED) AS total_sold,
                CAST(SUM(ct.so_luong * ct.don_gia) AS DECIMAL(15, 0)) AS total_revenue,
                COALESCE(MAX(sp.hinh_anh_dai_dien), '') AS image_url
            FROM chitietdonhang ct
            JOIN donhang dh ON ct.ma_don_hang = dh.ma_don_hang
            LEFT JOIN bienthesanpham bt ON ct.ma_bien_the = bt.ma_bien_the
            LEFT JOIN sanpham sp ON bt.ma_san_pham = sp.ma_san_pham
            WHERE dh.trang_thai_don_hang != 'CANCELLED' 
              AND YEAR(dh.ngay_dat) = :year
            GROUP BY ct.ten_san_pham
            ORDER BY total_sold DESC
            LIMIT :limit
            """
        )
        result = await self.session.execute(query, {"limit": limit, "year": year})
        return [dict(row) for row in result.mappings().all()]

    # Query: Payment Method Distribution
    async def get_payment_method_stats(self) -> List[Dict[str, Any]]:
        query = text(
            """
            SELECT 
                COALESCE(pt.ten_phuong_thuc, 'Chưa xác định') AS payment_method,
                COUNT(tt.ma_thanh_toan) AS transaction_count,
                COALESCE(SUM(tt.so_tien), 0) AS total_amount
            FROM thanhtoan tt
            LEFT JOIN phuongthucthanhtoan pt ON tt.ma_phuong_thuc = pt.ma_phuong_thuc
            GROUP BY pt.ten_phuong_thuc
            ORDER BY transaction_count DESC
            """
        )
        result = await self.session.execute(query)
        return [dict(row) for row in result.mappings().all()]
