"""Business logic: hồ sơ cá nhân (khoá theo JWT `sub`)."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from loyalty.iam_client import fetch_me
from loyalty.models import HoSoNguoiDung
from loyalty.schemas import ProfileUpdate
from loyalty.security import CurrentUser
from loyalty.storage import delete_avatar, save_avatar


class ProfileService:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get_or_create(self, user: CurrentUser) -> HoSoNguoiDung:
        """Lần đầu user gọi API thì tạo hồ sơ, điền email/tên lấy từ IAM."""
        profile = await self._s.get(HoSoNguoiDung, user.sub)

        if profile is None:
            info = await fetch_me(user.token) or {}
            email = info.get("email") or None
            default_name = email.split("@")[0] if email else "Khách hàng"
            profile = HoSoNguoiDung(
                auth_user_id=user.sub,
                email=email,
                ho_ten=info.get("name") or default_name,
            )
            self._s.add(profile)
            await self._s.flush()
        elif profile.email is None:
            # Lần trước IAM lỗi nên chưa có email: thử bổ sung lại
            info = await fetch_me(user.token)
            if info and info.get("email"):
                profile.email = info["email"]
                await self._s.flush()

        return profile

    async def update_profile(self, user: CurrentUser, data: ProfileUpdate) -> HoSoNguoiDung:
        profile = await self.get_or_create(user)
        for field, value in data.model_dump(exclude_unset=True).items():
            if field == "ho_ten" and value is None:
                continue  # cột ho_ten không cho phép NULL
            setattr(profile, field, value)
        await self._s.flush()
        return profile
    
    async def set_avatar(self, user: CurrentUser, data: bytes) -> HoSoNguoiDung:
        profile = await self.get_or_create(user)
        old_url = profile.avatar_url
        profile.avatar_url = save_avatar(data)
        await self._s.flush()
        delete_avatar(old_url)  # xóa ảnh cũ sau khi đã lưu ảnh mới
        return profile