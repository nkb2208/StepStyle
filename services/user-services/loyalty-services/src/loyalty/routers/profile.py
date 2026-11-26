"""Endpoints hồ sơ của chính người dùng đang đăng nhập: /users/me."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from loyalty.db import get_session
from loyalty.schemas import ProfileOut, ProfileUpdate
from loyalty.security import CurrentUser, get_current_user
from loyalty.services.profile_service import ProfileService
from loyalty.config import get_settings
from loyalty.errors import bad_request

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


@router.post("/avatar", response_model=ProfileOut, summary="Tải ảnh đại diện (JPEG/PNG/WEBP, tối đa 2MB)")
async def upload_avatar(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    svc: ProfileService = Depends(get_service),
) -> ProfileOut:
    max_bytes = get_settings().avatar_max_bytes
    data = await file.read(max_bytes + 1)  # đọc dư 1 byte để biết có vượt giới hạn không
    if len(data) > max_bytes:
        raise bad_request("FILE_TOO_LARGE", f"Ảnh tối đa {max_bytes // (1024 * 1024)}MB")
    return await svc.set_avatar(user, data)