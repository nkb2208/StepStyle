"""Repository and service layer, exercised directly against the test database."""

from __future__ import annotations

import asyncio
from decimal import Decimal

from systemconfig.db import session_scope
from systemconfig.models import DEFAULT_BASE_SHIPPING_FEE, DEFAULT_FREE_SHIPPING_THRESHOLD
from systemconfig.repositories import SettingsRepository
from systemconfig.services import SettingsService


def run(coro):
    return asyncio.run(coro)


def test_store_singleton_is_created_with_defaults() -> None:
    async def scenario() -> None:
        async with session_scope() as session:
            service = SettingsService(session)
            store = await service.get_or_create_store()
            assert store.ma_cai_dat is not None
            assert store.ten_cua_hang == "Not configured"
            assert store.phi_van_chuyen_co_ban == DEFAULT_BASE_SHIPPING_FEE
            assert store.nguong_mien_phi_van_chuyen == DEFAULT_FREE_SHIPPING_THRESHOLD

        async with session_scope() as session:
            repository = SettingsRepository(session)
            row = await repository.get_store()
            assert row is not None
            assert row.ten_cua_hang == "Not configured"

    run(scenario())


def test_option_catalog_is_seeded_once() -> None:
    async def scenario() -> None:
        async with session_scope() as session:
            service = SettingsService(session)
            store = await service.get_or_create_store()
            first = await service.repo.list_payment_methods(store.ma_cai_dat)
            # A second call must not duplicate the catalog rows.
            await service.get_or_create_store()
            second = await service.repo.list_payment_methods(store.ma_cai_dat)
            first_codes = {row.code_phuong_thuc for row in first}
            second_codes = {row.code_phuong_thuc for row in second}
            assert first_codes == second_codes
            assert len(first) == len(second) == 6

    run(scenario())


def test_repository_returns_none_for_unknown_ids() -> None:
    async def scenario() -> None:
        async with session_scope() as session:
            service = SettingsService(session)
            store = await service.get_or_create_store()
            repository = service.repo
            assert await repository.get_payment_method(store.ma_cai_dat, 999999) is None
            assert await repository.get_shipping_partner(store.ma_cai_dat, 999999) is None

    run(scenario())


def test_calculate_shipping_fee_uses_the_store_thresholds() -> None:
    async def scenario() -> None:
        async with session_scope() as session:
            service = SettingsService(session)
            from systemconfig.schemas import StoreSettingsUpdate

            await service.update_store(
                StoreSettingsUpdate(base_shipping_fee=40000, free_shipping_threshold=500000)
            )
            assert await service.calculate_shipping_fee(Decimal(100000)) == Decimal(40000)
            assert await service.calculate_shipping_fee(Decimal(500000)) == Decimal(0)
            assert await service.calculate_shipping_fee(Decimal(999999)) == Decimal(0)

    run(scenario())
