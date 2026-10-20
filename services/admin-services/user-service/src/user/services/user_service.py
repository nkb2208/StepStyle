"""Business logic layer for the User Service."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from user.errors import bad_request, conflict, not_found
from user.models import NguoiDung, VaiTro
from user.repositories.user_repository import UserRepository
from user.schemas import UserCreate, UserListOut, UserOut, UserUpdate

_VALID_ROLES = {v.value for v in VaiTro}


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
        """Tạo người dùng mới (quản trị viên)."""
        if data.vai_tro not in _VALID_ROLES:
            raise bad_request("INVALID_VAI_TRO", f"Vai trò '{data.vai_tro}' không hợp lệ")
        existing = await self._repo.get_by_email(data.email)
        if existing is not None:
            raise conflict("EMAIL_TAKEN", f"Email '{data.email}' đã được sử dụng")
        user = await self._repo.create(data)
        return UserOut.model_validate(user)

    async def update_user(self, user_id: int, data: UserUpdate) -> UserOut:
        """Cập nhật thông tin người dùng (quản trị viên)."""
        if data.vai_tro is not None and data.vai_tro not in _VALID_ROLES:
            raise bad_request("INVALID_VAI_TRO", f"Vai trò '{data.vai_tro}' không hợp lệ")
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
