import os

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from order.db import Base, get_session  # noqa: E402
from order.main import app  # noqa: E402
from order.models import (  # noqa: E402
    ChiTietDonHang,
    DonHang,
    NguoiDung,
    PhuongThucThanhToan,
    ThanhToan,
)
from order.security import CurrentUser, get_current_user  # noqa: E402


@pytest_asyncio.fixture
async def session_factory():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with factory() as s:
        s.add_all([NguoiDung(id=1, ho_ten="Nguyễn A", email="a@x.com"), PhuongThucThanhToan(id=1, ten_phuong_thuc="COD")])
        s.add_all(
            [
                DonHang(id=1, ma_nguoi_dung=1, ten_nguoi_nhan="Nguyễn A", so_dien_thoai_nhan="0901",
                        dia_chi_giao_hang="HCM", tong_tien_hang=300, tien_giam_gia=0, phi_van_chuyen=30,
                        tong_thanh_toan=330, trang_thai="PENDING"),
                DonHang(id=2, ma_nguoi_dung=None, ten_nguoi_nhan="Trần B", so_dien_thoai_nhan="0902",
                        dia_chi_giao_hang="HN", tong_tien_hang=100, tong_thanh_toan=100, trang_thai="SHIPPED"),
            ]
        )
        await s.flush()
        s.add_all(
            [
                ChiTietDonHang(ma_don_hang=1, ma_bien_the=1, ten_san_pham="Giày X", kich_co="42",
                               mau_sac="Đen", so_luong=2, don_gia=150),
                ThanhToan(ma_don_hang=1, ma_phuong_thuc=1, so_tien=330, trang_thai="PENDING"),
            ]
        )
        await s.commit()
    yield factory
    await engine.dispose()


def _client(session_factory, role):
    async def _session():
        async with session_factory() as s:
            try:
                yield s
            except BaseException:
                await s.rollback()
                raise
            else:
                await s.commit()

    app.dependency_overrides[get_session] = _session
    app.dependency_overrides[get_current_user] = lambda: CurrentUser("1", "t@x.com", role)
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://t")


@pytest_asyncio.fixture
async def admin(session_factory):
    async with _client(session_factory, "ADMIN") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def customer(session_factory):
    async with _client(session_factory, "CUSTOMER") as c:
        yield c
    app.dependency_overrides.clear()
