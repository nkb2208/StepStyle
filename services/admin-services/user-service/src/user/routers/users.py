"""REST endpoints cho resource /users.

Phân quyền (chỉ dành cho quản trị viên):
- ``GET  /users``          → danh sách tất cả tài khoản (có phân trang)
- ``POST /users``          → tạo tài khoản mới
- ``GET  /users/{id}``     → xem tài khoản theo ID
- ``PUT  /users/{id}``     → cập nhật tài khoản (đổi vai trò, kích hoạt/khoá)
- ``DELETE /users/{id}``   → xoá tài khoản
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from user.db import get_session
from user.schemas import UserCreate, UserListOut, UserOut, UserUpdate
from user.security import CurrentUser, require_admin
from user.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


def get_service(session: AsyncSession = Depends(get_session)) -> UserService:
    return UserService(session)


# ── Quản trị viên: quản lý tài khoản người dùng ─────────────────────────────

@router.get("", response_model=UserListOut, summary="Danh sách tài khoản người dùng")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _admin: CurrentUser = Depends(require_admin),
    svc: UserService = Depends(get_service),
) -> UserListOut:
    """Quản trị viên lấy danh sách toàn bộ tài khoản (có phân trang)."""
    return await svc.list_users(page=page, page_size=page_size)


@router.get("/{user_id}", response_model=UserOut, summary="Xem tài khoản theo ID")
async def get_user(
    user_id: int,
    _admin: CurrentUser = Depends(require_admin),
    svc: UserService = Depends(get_service),
) -> UserOut:
    """Quản trị viên xem thông tin tài khoản bất kỳ."""
    return await svc.get_user(user_id)


@router.post("", response_model=UserOut, status_code=201, summary="Tạo tài khoản người dùng")
async def create_user(
    body: UserCreate,
    _admin: CurrentUser = Depends(require_admin),
    svc: UserService = Depends(get_service),
) -> UserOut:
    """Quản trị viên tạo tài khoản mới (khách hàng hoặc quản trị viên)."""
    return await svc.create_user(body)


@router.put("/{user_id}", response_model=UserOut, summary="Cập nhật tài khoản người dùng")
async def update_user(
    user_id: int,
    body: UserUpdate,
    _admin: CurrentUser = Depends(require_admin),
    svc: UserService = Depends(get_service),
) -> UserOut:
    """Quản trị viên cập nhật thông tin tài khoản, đổi vai trò, kích hoạt/vô hiệu hoá."""
    return await svc.update_user(user_id, body)


@router.delete("/{user_id}", status_code=204, summary="Xoá tài khoản người dùng")
async def delete_user(
    user_id: int,
    _admin: CurrentUser = Depends(require_admin),
    svc: UserService = Depends(get_service),
) -> None:
    """Quản trị viên xoá tài khoản người dùng."""
    await svc.delete_user(user_id)
