from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from loyalty.config import get_settings
from loyalty.errors import ApiError, bad_request, conflict, forbidden, not_found
from loyalty.models import (
    GiaoDichVip,
    GoiVip,
    HangThanhVien,
    ThanhVien,
    TrangThaiGiaoDich,
)
from loyalty.schemas import MembershipOut, VipBenefitsOut, VipPackageOut
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
    
    # ── Gói VIP ────────────────────────────────────────────────────────────
    async def list_packages(self) -> list[VipPackageOut]:
        rows = await self._s.execute(
            select(GoiVip, HangThanhVien.ma_hang)
            .join(HangThanhVien, HangThanhVien.id == GoiVip.hang_id)
            .where(GoiVip.dang_ban.is_(True))
            .order_by(GoiVip.gia)
        )
        return [
            VipPackageOut(id=p.id, ten_goi=p.ten_goi, gia=p.gia, so_ngay=p.so_ngay, ma_hang=ma)
            for p, ma in rows.all()
        ]

    async def purchase(self, user: CurrentUser, goi_id: int) -> GiaoDichVip:
        pkg = await self._s.get(GoiVip, goi_id)
        if pkg is None or not pkg.dang_ban:
            raise not_found("Gói VIP")

        _, current, active = await self._effective(user.sub)
        target = await self._s.get(HangThanhVien, pkg.hang_id)
        if active and current.cap_do > target.cap_do:
            raise conflict("HIGHER_TIER_ACTIVE", "Bạn đang có hạng cao hơn gói này")

        txn = GiaoDichVip(
            ma_giao_dich=f"VIP{uuid.uuid4().hex[:20].upper()}",
            auth_user_id=user.sub,
            goi_id=pkg.id,
            so_tien=pkg.gia,
            trang_thai=TrangThaiGiaoDich.PENDING.value,
            ngay_tao=utcnow(),
        )
        self._s.add(txn)
        await self._s.flush()
        return txn

    async def list_transactions(self, user: CurrentUser) -> list[GiaoDichVip]:
        rows = await self._s.execute(
            select(GiaoDichVip)
            .where(GiaoDichVip.auth_user_id == user.sub)
            .order_by(GiaoDichVip.id.desc())
        )
        return list(rows.scalars().all())

    async def mock_pay(self, user: CurrentUser, ma_giao_dich: str) -> GiaoDichVip:
        """Giả lập thanh toán thành công (chỉ khi VIP_MOCK_PAYMENT=true)."""
        if not get_settings().vip_mock_payment:
            raise forbidden("Thanh toán giả lập đã bị tắt")

        txn = (
            await self._s.execute(
                select(GiaoDichVip)
                .where(GiaoDichVip.ma_giao_dich == ma_giao_dich)
                .with_for_update()
            )
        ).scalar_one_or_none()
        if txn is None or txn.auth_user_id != user.sub:
            raise not_found("Giao dịch")
        return await self.activate_transaction(txn)

    async def activate_transaction(self, txn: GiaoDichVip) -> GiaoDichVip:
        """Idempotent: gọi nhiều lần cũng chỉ cộng quyền lợi một lần.

        Đây là điểm DUY NHẤT nâng hạng. Cổng thanh toán thật sau này chỉ cần
        gọi lại hàm này sau khi xác minh chữ ký callback.
        """
        if txn.trang_thai == TrangThaiGiaoDich.SUCCESS.value:
            return txn
        if txn.trang_thai != TrangThaiGiaoDich.PENDING.value:
            raise bad_request("TXN_NOT_PAYABLE", f"Giao dịch đang ở trạng thái {txn.trang_thai}")

        pkg = await self._s.get(GoiVip, txn.goi_id)
        target = await self._s.get(HangThanhVien, pkg.hang_id)
        member, current, active = await self._effective(txn.auth_user_id)
        now = utcnow()

        if active and current.id == target.id and member.ngay_het_han:
            start = max(member.ngay_het_han, now)  # cùng hạng: gia hạn nối tiếp
        else:
            start = now
        member.hang_id = target.id
        member.ngay_het_han = start + timedelta(days=pkg.so_ngay)
        member.tong_diem += txn.so_tien // 1000

        txn.trang_thai = TrangThaiGiaoDich.SUCCESS.value
        txn.ngay_thanh_toan = now
        await self._s.flush()
        return txn