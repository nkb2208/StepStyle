"""Business logic: sổ địa chỉ giao hàng."""

from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from loyalty.errors import bad_request, not_found
from loyalty.models import DiaChiGiaoHang
from loyalty.schemas import AddressCreate, AddressUpdate
from loyalty.security import CurrentUser

MAX_ADDRESSES = 10


class AddressService:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def list_addresses(self, user: CurrentUser) -> list[DiaChiGiaoHang]:
        rows = await self._s.execute(
            select(DiaChiGiaoHang)
            .where(DiaChiGiaoHang.auth_user_id == user.sub)
            .order_by(DiaChiGiaoHang.mac_dinh.desc(), DiaChiGiaoHang.id.desc())
        )
        return list(rows.scalars().all())

    async def _get_own(self, user: CurrentUser, address_id: int) -> DiaChiGiaoHang:
        addr = await self._s.get(DiaChiGiaoHang, address_id)
        if addr is None or addr.auth_user_id != user.sub:
            raise not_found("Địa chỉ")
        return addr

    async def _clear_default(self, user_id: str) -> None:
        await self._s.execute(
            update(DiaChiGiaoHang)
            .where(DiaChiGiaoHang.auth_user_id == user_id)
            .values(mac_dinh=False)
        )

    async def create_address(self, user: CurrentUser, data: AddressCreate) -> DiaChiGiaoHang:
        existing = await self.list_addresses(user)
        if len(existing) >= MAX_ADDRESSES:
            raise bad_request("ADDRESS_LIMIT", f"Tối đa {MAX_ADDRESSES} địa chỉ")

        make_default = data.mac_dinh or not existing  # địa chỉ đầu tiên luôn là mặc định
        if make_default:
            await self._clear_default(user.sub)

        addr = DiaChiGiaoHang(
            **data.model_dump(exclude={"mac_dinh"}),
            auth_user_id=user.sub,
            mac_dinh=make_default,
        )
        self._s.add(addr)
        await self._s.flush()
        return addr

    async def update_address(
        self, user: CurrentUser, address_id: int, data: AddressUpdate
    ) -> DiaChiGiaoHang:
        addr = await self._get_own(user, address_id)
        values = data.model_dump(exclude_unset=True)

        if values.get("mac_dinh") is True:
            await self._clear_default(user.sub)

        for field, value in values.items():
            if value is None:
                continue
            if field == "mac_dinh" and value is False:
                continue
            setattr(addr, field, value)

        await self._s.flush()
        return addr

    async def set_default(self, user: CurrentUser, address_id: int) -> DiaChiGiaoHang:
        addr = await self._get_own(user, address_id)
        await self._clear_default(user.sub)
        addr.mac_dinh = True
        await self._s.flush()
        return addr

    async def delete_address(self, user: CurrentUser, address_id: int) -> None:
        addr = await self._get_own(user, address_id)
        was_default = addr.mac_dinh
        await self._s.delete(addr)
        await self._s.flush()

        if was_default:
            remaining = await self.list_addresses(user)
            if remaining:
                remaining[0].mac_dinh = True
                await self._s.flush()