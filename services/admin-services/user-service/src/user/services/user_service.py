"""Business logic layer for the User Service."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from user.errors import conflict, not_found
from user.models import NguoiDung
from user.repositories.user_repository import UserRepository
from user.schemas import UserCreate, UserListOut, UserOut, UserUpdate


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = UserRepository(session)

    async def list_users(self, *, page: int = 1, page_size: int = 20) -> UserListOut:
        users, total = await self._repo.list_users(page=page, page_size=page_size)
        return UserListOut(
            items=[UserOut.model_validate(u) for u in users],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_user(self, user_id: int) -> UserOut:
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise not_found("User")
        return UserOut.model_validate(user)

    async def create_user(self, data: UserCreate) -> UserOut:
        existing = await self._repo.get_by_email(data.email)
        if existing is not None:
            raise conflict("EMAIL_TAKEN", f"Email '{data.email}' is already in use")
        user = await self._repo.create(data)
        return UserOut.model_validate(user)

    async def update_user(self, user_id: int, data: UserUpdate) -> UserOut:
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise not_found("User")
        updated = await self._repo.update(user, data)
        return UserOut.model_validate(updated)

    async def delete_user(self, user_id: int) -> None:
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise not_found("User")
        await self._repo.delete(user)
