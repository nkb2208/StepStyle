"""Endpoints hồ sơ của chính người dùng đang đăng nhập: /users/me."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from loyalty.db import get_session
from loyalty.schemas import ProfileOut, ProfileUpdate
from loyalty.security import CurrentUser, get_current_user
from loyalty.services.profile_service import ProfileService

router = APIRouter(prefix="/users/me", tags=["profile"])


def get_service(session: AsyncSession = Depends(get_session)) -> ProfileService:
    return ProfileService(session)


@router.get("", response_model=ProfileOut, summary="Xem hồ sơ của tôi")
async def get_me(
    user: CurrentUser = Depends(get_current_user),
    svc: ProfileService = Depends(get_service),
) -> ProfileOut:
    return await svc.get_or_create(user)


@router.put("", response_model=ProfileOut, summary="Cập nhật hồ sơ của tôi")
async def update_me(
    body: ProfileUpdate,
    user: CurrentUser = Depends(get_current_user),
    svc: ProfileService = Depends(get_service),
) -> ProfileOut:
    return await svc.update_profile(user, body)