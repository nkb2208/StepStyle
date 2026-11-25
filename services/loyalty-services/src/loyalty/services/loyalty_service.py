"""Business logic: hạng thành viên và quyền lợi."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from loyalty.errors import ApiError
from loyalty.models import HangThanhVien, ThanhVien
from loyalty.schemas import MembershipOut, VipBenefitsOut
from loyalty.security import CurrentUser

STANDARD = "STANDARD"


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class LoyaltyService:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def _tier_by_code(self, ma: str) -> HangThanhVien:
        tier = (
            await self._s.execute(select(HangThanhVien).where(HangThanhVien.ma_hang == ma))
        ).scalar_one_or_none()
        if tier is None:
            raise ApiError(500, "TIER_MISSING", f"Chưa cấu hình hạng {ma}")
        return tier

    async def _get_or_create_member(self, user_id: str) -> ThanhVien:
        member = await self._s.get(ThanhVien, user_id)
        if member is None:
            base = await self._tier_by_code(STANDARD)
            member = ThanhVien(auth_user_id=user_id, hang_id=base.id, tong_diem=0)
            self._s.add(member)
            await self._s.flush()
        return member

    async def _effective(self, user_id: str) -> tuple[ThanhVien, HangThanhVien, bool]:
        """Trả về (member, hạng đang hiệu lực, còn hạn?).

        Hạng khác STANDARD mà hết hạn (hoặc không có ngày hết hạn) thì rơi về STANDARD.
        """
        member = await self._get_or_create_member(user_id)
        tier = await self._s.get(HangThanhVien, member.hang_id)
        base = await self._tier_by_code(STANDARD)
        if tier.id == base.id:
            return member, tier, True
        if member.ngay_het_han is None or member.ngay_het_han < utcnow():
            return member, base, False
        return member, tier, True

    async def get_membership(self, user: CurrentUser) -> MembershipOut:
        member, tier, active = await self._effective(user.sub)
        return MembershipOut(
            ma_hang=tier.ma_hang,
            ten_hang=tier.ten_hang,
            phan_tram_giam=tier.phan_tram_giam,
            mien_phi_van_chuyen=tier.mien_phi_van_chuyen,
            tong_diem=member.tong_diem,
            ngay_het_han=member.ngay_het_han,
            con_han=active,
        )

    async def get_benefits(self, user_id: str) -> VipBenefitsOut:
        member, tier, _ = await self._effective(user_id)
        return VipBenefitsOut(
            user_id=user_id,
            tier=tier.ma_hang,
            tier_name=tier.ten_hang,
            discount_percent=tier.phan_tram_giam,
            free_shipping=tier.mien_phi_van_chuyen,
            expires_at=member.ngay_het_han if tier.ma_hang != STANDARD else None,
        )