"""Endpoints mua gói VIP: /vip/..."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from loyalty.db import get_session
from loyalty.schemas import PurchaseIn, TransactionOut, VipPackageOut
from loyalty.security import CurrentUser, get_current_user
from loyalty.services.loyalty_service import LoyaltyService

router = APIRouter(prefix="/vip", tags=["vip"])


def get_service(session: AsyncSession = Depends(get_session)) -> LoyaltyService:
    return LoyaltyService(session)


@router.get("/packages", response_model=list[VipPackageOut], summary="Các gói VIP đang bán")
async def list_packages(
    _user: CurrentUser = Depends(get_current_user),
    svc: LoyaltyService = Depends(get_service),
):
    return await svc.list_packages()


@router.post("/purchase", response_model=TransactionOut, status_code=201, summary="Mua gói VIP")
async def purchase(
    body: PurchaseIn,
    user: CurrentUser = Depends(get_current_user),
    svc: LoyaltyService = Depends(get_service),
):
    return await svc.purchase(user, body.goi_id)


@router.get("/transactions", response_model=list[TransactionOut], summary="Lịch sử mua VIP")
async def list_transactions(
    user: CurrentUser = Depends(get_current_user),
    svc: LoyaltyService = Depends(get_service),
):
    return await svc.list_transactions(user)


@router.post(
    "/transactions/{ma_giao_dich}/mock-pay",
    response_model=TransactionOut,
    summary="Giả lập thanh toán thành công (chỉ dev)",
)
async def mock_pay(
    ma_giao_dich: str,
    user: CurrentUser = Depends(get_current_user),
    svc: LoyaltyService = Depends(get_service),
):
    return await svc.mock_pay(user, ma_giao_dich)