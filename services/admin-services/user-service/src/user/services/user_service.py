"""Business logic layer for the User Service."""

from __future__ import annotations

import logging

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from user.config import get_settings
from user.errors import bad_request, conflict, not_found
from user.models import NguoiDung, VaiTro
from user.repositories.user_repository import UserRepository
from user.schemas import UserCreate, UserListOut, UserOut, UserUpdate

_VALID_ROLES = {v.value for v in VaiTro}
_logger = logging.getLogger(__name__)


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = UserRepository(session)

    async def list_users(self, *, page: int = 1, page_size: int = 20) -> UserListOut:
        """Lấy danh sách người dùng có phân trang (quản trị viên)."""
        users, total = await self._repo.list_users(page=page, page_size=page_size)
        return UserListOut(
            items=[UserOut.model_validate(u) for u in users],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_user(self, user_id: int) -> UserOut:
        """Lấy thông tin người dùng theo ID (quản trị viên)."""
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise not_found("Người dùng")
        return UserOut.model_validate(user)

    async def create_user(self, data: UserCreate) -> UserOut:
        """Tạo tài khoản quản trị viên mới (ADMIN) và đồng bộ sang auth-service."""
        existing = await self._repo.get_by_email(data.email)
        if existing is not None:
            raise conflict("EMAIL_TAKEN", f"Email '{data.email}' đã được sử dụng")
        user = await self._repo.create(data)

        # ── Đồng bộ sang auth-service (Best-effort, không block nếu thất bại) ──
        await self._sync_to_auth_service(
            email=data.email,
            password=data.mat_khau,
            name=data.ho_ten,
        )

        return UserOut.model_validate(user)

    async def _sync_to_auth_service(self, *, email: str, password: str, name: str) -> None:
        """Đăng ký tài khoản sang auth-service thông qua public /api/auth/register.

        Nếu email đã tồn tại hoặc auth-service không khả dụng thì chỉ log warning,
        không raise exception để tránh rollback transaction MySQL.
        """
        settings = get_settings()
        auth_url = settings.auth_service_url.rstrip("/")
        payload = {
            "email": email,
            "password": password,
            "name": name,
            "role": "ADMIN",
        }
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    f"{auth_url}/api/auth/register",
                    json=payload,
                )
            if response.status_code in (200, 201):
                _logger.info("Đồng bộ tài khoản sang auth-service thành công: %s", email)
            elif response.status_code == 409:
                _logger.warning(
                    "Tài khoản đã tồn tại trong auth-service (bỏ qua): %s", email
                )
            else:
                _logger.warning(
                    "auth-service trả về lỗi khi đồng bộ %s: HTTP %s — %s",
                    email,
                    response.status_code,
                    response.text[:200],
                )
        except httpx.RequestError as exc:
            _logger.warning(
                "Không thể kết nối auth-service để đồng bộ %s: %s", email, exc
            )

    async def update_user(self, user_id: int, data: UserUpdate) -> UserOut:
        """Cập nhật thông tin tài khoản quản trị viên (họ tên, số điện thoại, trạng thái)."""
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise not_found("Người dùng")
        updated = await self._repo.update(user, data)
        return UserOut.model_validate(updated)

    async def delete_user(self, user_id: int) -> None:
        """Xoá người dùng (quản trị viên)."""
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise not_found("Người dùng")
        await self._repo.delete(user)

