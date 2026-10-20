"""Repository layer for user CRUD operations."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from user.models import NguoiDung, VaiTro
from user.schemas import UserCreate, UserUpdate


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: int) -> NguoiDung | None:
        result = await self._session.execute(
            select(NguoiDung).where(NguoiDung.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> NguoiDung | None:
        result = await self._session.execute(
            select(NguoiDung).where(NguoiDung.email == email)
        )
        return result.scalar_one_or_none()

    async def list_users(
        self, *, page: int = 1, page_size: int = 20
    ) -> tuple[list[NguoiDung], int]:
        offset = (page - 1) * page_size
        count_result = await self._session.execute(
            select(func.count()).select_from(NguoiDung)
        )
        total = count_result.scalar_one()
        rows = await self._session.execute(
            select(NguoiDung).offset(offset).limit(page_size)
        )
        return list(rows.scalars().all()), total

    async def create(self, data: UserCreate) -> NguoiDung:
        user_dict = data.model_dump()
        user_dict["vai_tro"] = VaiTro.ADMIN.value
        user_dict["kich_hoat"] = True
        user = NguoiDung(**user_dict)
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def update(self, user: NguoiDung, data: UserUpdate) -> NguoiDung:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(user, field, value)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def delete(self, user: NguoiDung) -> None:
        await self._session.delete(user)
        await self._session.flush()
