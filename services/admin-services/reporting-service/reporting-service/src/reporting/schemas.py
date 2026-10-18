from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


# Overview KPI Schemas
class OverviewStatsOut(BaseModel):
    year: int
    total_revenue: float = Field(0.0, description="Tổng doanh thu thực tế (đã trừ đơn hủy)")
    total_orders: int = Field(0, description="Tổng số đơn hàng")
    average_order_value: float = Field(0.0, description="Giá trị trung bình mỗi đơn")
    successful_orders: int = Field(0, description="Số đơn giao thành công")
    cancelled_orders: int = Field(0, description="Số đơn bị hủy")
    cancel_rate: float = Field(0.0, description="Tỉ lệ hủy đơn (%)")
    top_month: str = Field("Không có dữ liệu", description="Tháng có doanh thu cao nhất")
    top_month_revenue: float = Field(0.0, description="Doanh thu của tháng cao nhất")


# Monthly Revenue Schemas
class MonthlyStatsItem(BaseModel):
    month: int
    month_label: str
    revenue: float = 0.0
    total_orders: int = 0
    successful_orders: int = 0
    cancelled_orders: int = 0
    average_value: float = 0.0
    cancel_rate: float = 0.0


class MonthlyStatsOut(BaseModel):
    year: int
    items: List[MonthlyStatsItem] = []


# Order Status Schemas
class OrderStatusItem(BaseModel):
    status: str
    label: str
    count: int = 0
    percentage: float = 0.0


class OrderStatusStatsOut(BaseModel):
    year: int
    total_orders: int = 0
    items: List[OrderStatusItem] = []


# Top Selling Products Schemas
class TopProductItem(BaseModel):
    product_name: str
    total_sold: int = 0
    total_revenue: float = 0.0
    image_url: Optional[str] = ""


class TopProductsOut(BaseModel):
    year: int
    items: List[TopProductItem] = []


# Payment Method Schemas
class PaymentMethodItem(BaseModel):
    payment_method: str
    transaction_count: int = 0
    total_amount: float = 0.0
    percentage: float = 0.0


class PaymentMethodsOut(BaseModel):
    total_transactions: int = 0
    items: List[PaymentMethodItem] = []
