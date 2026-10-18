"""REST endpoints for the /users resource."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from user.db import get_session
from user.schemas import UserCreate, UserListOut, UserOut, UserUpdate
from user.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


def get_service(session: AsyncSession = Depends(get_session)) -> UserService:
    return UserService(session)


@router.get("", response_model=UserListOut)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    svc: UserService = Depends(get_service),
) -> UserListOut:
    """Lấy danh sách người dùng (phân trang)."""
    return await svc.list_users(page=page, page_size=page_size)


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: int,
    svc: UserService = Depends(get_service),
) -> UserOut:
    """Lấy thông tin một người dùng theo ID."""
    return await svc.get_user(user_id)


@router.post("", response_model=UserOut, status_code=201)
async def create_user(
    body: UserCreate,
    svc: UserService = Depends(get_service),
) -> UserOut:
    """Tạo người dùng mới."""
    return await svc.create_user(body)


@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: UserUpdate,
    svc: UserService = Depends(get_service),
) -> UserOut:
    """Cập nhật thông tin người dùng."""
    return await svc.update_user(user_id, body)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    svc: UserService = Depends(get_service),
) -> None:
    """Xoá người dùng."""
    await svc.delete_user(user_id)
