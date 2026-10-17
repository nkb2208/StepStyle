"""Schema validation rules that mirror the SQL CHECK constraints."""

from __future__ import annotations

from decimal import Decimal

import pytest
from pydantic import ValidationError

from systemconfig.schemas import (
    PaymentMethodUpdate,
    ShippingPartnerUpdate,
    StoreSettingsUpdate,
)

# ── Store information ───────────────────────────────────────────────────────


def test_store_settings_accepts_whole_vnd_amounts() -> None:
    settings = StoreSettingsUpdate(base_shipping_fee=35000, free_shipping_threshold=500000)
    assert settings.base_shipping_fee == Decimal(35000)
    assert settings.free_shipping_threshold == Decimal(500000)


def test_store_settings_rejects_empty_store_name() -> None:
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(store_name="   ")


def test_store_settings_rejects_null_store_name() -> None:
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(store_name=None)


def test_store_settings_accepts_a_blank_email_but_rejects_a_malformed_one() -> None:
    assert StoreSettingsUpdate(contact_email="").contact_email is None
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(contact_email="not-an-email")


def test_store_settings_phone_follows_the_vietnamese_format() -> None:
    assert StoreSettingsUpdate(phone="0901 234 567").phone == "0901234567"
    assert StoreSettingsUpdate(phone="+84901234567").phone == "+84901234567"
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(phone="12345")
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(phone="0901234567890")


def test_store_settings_rejects_a_negative_shipping_fee() -> None:
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(base_shipping_fee=-1)


def test_store_settings_rejects_a_negative_free_shipping_threshold() -> None:
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(free_shipping_threshold=-1)


def test_store_settings_rejects_formatted_money_strings() -> None:
    """`"35.000"` must never be written to a DECIMAL(15,0) column."""
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(base_shipping_fee="35.000")


def test_store_settings_rejects_fractional_amounts() -> None:
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(free_shipping_threshold=500000.5)


def test_store_settings_does_not_compare_fee_against_threshold() -> None:
    """The two values answer different questions; no ordering is enforced."""
    settings = StoreSettingsUpdate(base_shipping_fee=500000, free_shipping_threshold=1000)
    assert settings.base_shipping_fee == Decimal(500000)


def test_store_settings_rejects_unknown_fields() -> None:
    """Integration secrets have no place in the settings payload."""
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(api_secret="hunter2")


def test_store_settings_partial_address_only_sets_given_segments() -> None:
    settings = StoreSettingsUpdate(warehouse_address={"detail": "12 Nguyen Hue"})
    assert settings.warehouse_address is not None
    assert settings.warehouse_address.ward is None
    dumped = settings.model_dump(exclude_unset=True)
    assert set(dumped["warehouse_address"]) == {"detail"}


# ── Payment methods / shipping partners ─────────────────────────────────────


def test_payment_method_update_accepts_a_lone_toggle() -> None:
    update = PaymentMethodUpdate(enabled=True)
    assert update.model_dump(exclude_unset=True) == {"enabled": True}


def test_payment_method_update_requires_at_least_one_field() -> None:
    with pytest.raises(ValidationError):
        PaymentMethodUpdate()


def test_payment_method_update_rejects_null_toggle_or_name() -> None:
    with pytest.raises(ValidationError):
        PaymentMethodUpdate(enabled=None)
    with pytest.raises(ValidationError):
        PaymentMethodUpdate(name=None)


def test_payment_method_update_allows_clearing_the_description() -> None:
    update = PaymentMethodUpdate(description=None)
    assert update.model_dump(exclude_unset=True) == {"description": None}


def test_payment_method_update_rejects_unknown_fields() -> None:
    with pytest.raises(ValidationError):
        PaymentMethodUpdate(code="momo")


def test_shipping_partner_update_requires_at_least_one_field() -> None:
    with pytest.raises(ValidationError):
        ShippingPartnerUpdate()


def test_shipping_partner_update_accepts_a_toggle() -> None:
    assert ShippingPartnerUpdate(enabled=False).model_dump(exclude_unset=True) == {"enabled": False}
