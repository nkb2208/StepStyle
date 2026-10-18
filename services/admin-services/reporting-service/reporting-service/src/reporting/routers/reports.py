from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from reporting.db import get_session
from reporting.schemas import (
    MonthlyStatsOut,
    OrderStatusStatsOut,
    OverviewStatsOut,
    PaymentMethodsOut,
    TopProductsOut,
)
from reporting.services.reporting_service import ReportingService

router = APIRouter(prefix="/reports", tags=["reports"])


def get_service(session: AsyncSession = Depends(get_session)) -> ReportingService:
    return ReportingService(session)


# Endpoint: KPI Overview
@router.get("/overview", response_model=OverviewStatsOut)
async def get_overview(
    year: int = Query(default_factory=lambda: datetime.now().year, ge=2000, le=2100),
    service: ReportingService = Depends(get_service),
) -> OverviewStatsOut:
    return await service.get_overview(year)


# Endpoint: Monthly Revenue & Orders
@router.get("/monthly", response_model=MonthlyStatsOut)
async def get_monthly(
    year: int = Query(default_factory=lambda: datetime.now().year, ge=2000, le=2100),
    service: ReportingService = Depends(get_service),
) -> MonthlyStatsOut:
    return await service.get_monthly_revenue(year)


# Endpoint: Order Status Distribution
@router.get("/order-status", response_model=OrderStatusStatsOut)
async def get_order_status(
    year: int = Query(default_factory=lambda: datetime.now().year, ge=2000, le=2100),
    service: ReportingService = Depends(get_service),
) -> OrderStatusStatsOut:
    return await service.get_order_status(year)


# Endpoint: Top Selling Products
@router.get("/top-products", response_model=TopProductsOut)
async def get_top_products(
    limit: int = Query(5, ge=1, le=50),
    year: int = Query(default_factory=lambda: datetime.now().year, ge=2000, le=2100),
    service: ReportingService = Depends(get_service),
) -> TopProductsOut:
    return await service.get_top_products(limit, year)


# Endpoint: Payment Methods Distribution
@router.get("/payment-methods", response_model=PaymentMethodsOut)
async def get_payment_methods(
    service: ReportingService = Depends(get_service),
) -> PaymentMethodsOut:
    return await service.get_payment_methods()
