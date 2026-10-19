"""REST endpoints cho resource /users.

Phân quyền:
- ``GET /users``               → quản trị viên — danh sách người dùng
- ``POST /users``              → quản trị viên — tạo tài khoản
- ``GET /users/{id}``          → quản trị viên — xem tài khoản bất kỳ
- ``PUT /users/{id}``          → quản trị viên — cập nhật tài khoản bất kỳ
- ``DELETE /users/{id}``       → quản trị viên — xoá tài khoản
- ``GET /users/me``            → khách hàng thành viên — xem thông tin cá nhân
- ``PATCH /users/me``          → khách hàng thành viên — cập nhật thông tin cá nhân
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from user.db import get_session
from user.schemas import ProfileOut, ProfileUpdate, UserCreate, UserListOut, UserOut, UserUpdate
from user.security import CurrentUser, require_admin, require_customer
from user.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


def get_service(session: AsyncSession = Depends(get_session)) -> UserService:
    return UserService(session)


# ── Khách hàng thành viên: thông tin cá nhân ─────────────────────────────────

@router.get("/me", response_model=ProfileOut, summary="Xem thông tin cá nhân")
async def get_my_profile(
    current_user: CurrentUser = Depends(require_customer),
    svc: UserService = Depends(get_service),
) -> ProfileOut:
    """Khách hàng đang đăng nhập xem thông tin cá nhân của mình."""
    return await svc.get_profile(current_user.email)


@router.patch("/me", response_model=ProfileOut, summary="Cập nhật thông tin cá nhân")
async def update_my_profile(
    body: ProfileUpdate,
    current_user: CurrentUser = Depends(require_customer),
    svc: UserService = Depends(get_service),
) -> ProfileOut:
    """Khách hàng tự cập nhật họ tên, số điện thoại, địa chỉ (không đổi được vai trò)."""
    return await svc.update_profile(current_user.email, body)


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

