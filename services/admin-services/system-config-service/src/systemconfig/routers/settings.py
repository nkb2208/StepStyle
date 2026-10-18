"""REST API for the store configuration (``/api/v1/settings``).

Three resources, each backed by one pre-existing table of `stepstyle_db`:

* ``/store``             → `caidatcuahang`             (single row)
* ``/payment-methods``   → `caidatphuongthucthanhtoan` (rows keyed by code/id)
* ``/shipping-partners`` → `caidatdoitacvanchuyen`     (rows keyed by code/id)

Every route requires an authenticated bearer token: reads need
``store_setting:read`` and writes need ``store_setting:update``. The ``ADMIN``
role holds the ``*:*`` wildcard, so non-admin principals cannot change the
configuration. Disabling a payment method or carrier only flips its ``kich_hoat``
flag — no row is ever deleted.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from systemconfig.db import get_session
from systemconfig.schemas import (
    PaymentMethodResponse,
    PaymentMethodUpdate,
    ShippingPartnerResponse,
    ShippingPartnerUpdate,
    StorefrontSettingsResponse,
    StoreSettingsResponse,
    StoreSettingsUpdate,
)
from systemconfig.security import require_permission
from systemconfig.services import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])

READ = [Depends(require_permission("store_setting:read"))]
UPDATE = [Depends(require_permission("store_setting:update"))]


# ── Public storefront ───────────────────────────────────────────────────────


@router.get(
    "/public",
    response_model=StorefrontSettingsResponse,
    summary="Public storefront configuration (enabled options only)",
)
async def get_public_settings(session: AsyncSession = Depends(get_session)) -> dict:
    """Non-sensitive store configuration for the customer-facing storefront.

    Deliberately unauthenticated: it exposes only the store name, the shipping
    rules and the *enabled* payment methods / carriers — never admin ids or
    gateway secrets.
    """
    return await SettingsService(session).get_storefront_settings()


# ── Store information ───────────────────────────────────────────────────────


@router.get(
    "/store",
    dependencies=READ,
    response_model=StoreSettingsResponse,
    summary="Read the store configuration",
)
async def get_store_settings(session: AsyncSession = Depends(get_session)) -> dict:
    return await SettingsService(session).get_store()


@router.put(
    "/store",
    dependencies=UPDATE,
    response_model=StoreSettingsResponse,
    summary="Update the store configuration",
)
async def update_store_settings(
    payload: StoreSettingsUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Partial update: fields left out keep their current value."""
    return await SettingsService(session).update_store(payload)


# ── Payment methods ─────────────────────────────────────────────────────────


@router.get(
    "/payment-methods",
    dependencies=READ,
    response_model=list[PaymentMethodResponse],
    summary="List the payment methods of the store",
)
async def list_payment_methods(session: AsyncSession = Depends(get_session)) -> list[dict]:
    return await SettingsService(session).list_payment_methods()


@router.put(
    "/payment-methods/{method_id}",
    dependencies=UPDATE,
    response_model=PaymentMethodResponse,
    summary="Enable/disable a payment method",
)
async def update_payment_method(
    payload: PaymentMethodUpdate,
    method_id: int = Path(..., ge=1, description="`ma_cai_dat_phuong_thuc`"),
    session: AsyncSession = Depends(get_session),
) -> dict:
    return await SettingsService(session).update_payment_method(method_id, payload)


# ── Shipping partners ───────────────────────────────────────────────────────


@router.get(
    "/shipping-partners",
    dependencies=READ,
    response_model=list[ShippingPartnerResponse],
    summary="List the shipping carriers of the store",
)
async def list_shipping_partners(session: AsyncSession = Depends(get_session)) -> list[dict]:
    return await SettingsService(session).list_shipping_partners()


@router.put(
    "/shipping-partners/{partner_id}",
    dependencies=UPDATE,
    response_model=ShippingPartnerResponse,
    summary="Enable/disable a shipping carrier",
)
async def update_shipping_partner(
    payload: ShippingPartnerUpdate,
    partner_id: int = Path(..., ge=1, description="`ma_cai_dat_doi_tac`"),
    session: AsyncSession = Depends(get_session),
) -> dict:
    return await SettingsService(session).update_shipping_partner(partner_id, payload)
