"""Endpoints hạng thành viên.

- router_me:       /users/me/membership   (dưới /api/v1, cho frontend)
- router_internal: /users/{id}/vip-benefits (dưới /api, cho Service 4 gọi)
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from loyalty.db import get_session
from loyalty.schemas import MembershipOut, VipBenefitsOut
from loyalty.security import CurrentUser, get_current_user
from loyalty.services.loyalty_service import LoyaltyService

logger = logging.getLogger("loyalty.membership")

router_me = APIRouter(prefix="/users/me", tags=["membership"])
router_internal = APIRouter(prefix="/users", tags=["internal (service-to-service)"])


def get_service(session: AsyncSession = Depends(get_session)) -> LoyaltyService:
    return LoyaltyService(session)


@router_me.get("/membership", response_model=MembershipOut, summary="Hạng thành viên của tôi")
async def my_membership(
    user: CurrentUser = Depends(get_current_user),
    svc: LoyaltyService = Depends(get_service),
) -> MembershipOut:
    return await svc.get_membership(user)


@router_internal.get(
    "/{user_id}/vip-benefits",
    response_model=VipBenefitsOut,
    summary="Quyền lợi VIP của user",
)
async def vip_benefits(
    user_id: str,
    user: CurrentUser = Depends(get_current_user),
    svc: LoyaltyService = Depends(get_service),
) -> VipBenefitsOut:
    if user_id != user.sub:
        logger.warning("vip-benefits: id trên URL (%s) khác sub trong token, dùng sub", user_id)
    return await svc.get_benefits(user.sub)