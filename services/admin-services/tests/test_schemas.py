"""Schema validation rules that mirror the SQL CHECK constraints."""

from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from pydantic import ValidationError

from adminfeat.schemas import (
    DiscountCreate,
    OrderCreate,
    OrderItemCreate,
    ProductCreate,
    ProductUpdate,
    StoreSettingsUpdate,
    UserCreate,
)

NOW = datetime(2026, 1, 1, 12, 0, 0)


def test_product_sale_price_cannot_exceed_original_price():
    with pytest.raises(ValidationError):
        ProductCreate(name="Air Max", original_price=Decimal(1000), sale_price=Decimal(2000))


def test_product_sale_price_equal_to_original_is_valid():
    product = ProductCreate(name="Air Max", original_price=Decimal(1000), sale_price=Decimal(1000))
    assert product.sale_price == Decimal(1000)


def test_product_update_cross_field_validation():
    with pytest.raises(ValidationError):
        ProductUpdate(original_price=Decimal(500), sale_price=Decimal(900))


def test_product_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        ProductCreate(name="Shoes", price=Decimal(100))


def test_discount_percent_cannot_exceed_100():
    with pytest.raises(ValidationError):
        DiscountCreate(code="BIG", type="PERCENT", value=Decimal(150))


def test_discount_window_must_be_ordered():
    with pytest.raises(ValidationError):
        DiscountCreate(
            code="LATE",
            type="PERCENT",
            value=Decimal(10),
            start_date=NOW,
            end_date=NOW - timedelta(days=1),
        )


def test_discount_requires_positive_quantity():
    with pytest.raises(ValidationError):
        DiscountCreate(code="FREE", type="PERCENT", value=Decimal(10), quantity=0)


def test_order_requires_at_least_one_item():
    with pytest.raises(ValidationError):
        OrderCreate(
            recipient_name="Nguyen Van A",
            phone="0900000000",
            address="12 Nguyen Hue",
            items=[],
        )


def test_order_item_quantity_must_be_positive():
    with pytest.raises(ValidationError):
        OrderItemCreate(variant_id=1, quantity=0)


def test_user_password_length():
    with pytest.raises(ValidationError):
        UserCreate(name="Admin", email="admin@example.com", password="short")


def test_user_email_is_validated():
    with pytest.raises(ValidationError):
        UserCreate(name="Admin", email="not-an-email", password="LongEnough123")


def test_order_may_omit_shipping_fee():
    """An omitted fee means "derive it from the store settings"."""
    order = OrderCreate(
        recipient_name="Nguyen Van A",
        phone="0900000000",
        address="12 Nguyen Hue",
        items=[{"variant_id": 1, "quantity": 1}],
    )
    assert order.shipping_fee is None


# ── Store settings ──────────────────────────────────────────────────────────


def test_store_settings_accepts_whole_vnd_amounts():
    settings = StoreSettingsUpdate(base_shipping_fee=35000, free_shipping_threshold=500000)
    assert settings.base_shipping_fee == Decimal(35000)
    assert settings.free_shipping_threshold == Decimal(500000)


def test_store_settings_rejects_empty_store_name():
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(store_name="   ")


def test_store_settings_rejects_null_store_name():
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(store_name=None)


def test_store_settings_accepts_a_blank_email_but_rejects_a_malformed_one():
    assert StoreSettingsUpdate(contact_email="").contact_email is None
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(contact_email="not-an-email")


def test_store_settings_phone_follows_the_vietnamese_format():
    assert StoreSettingsUpdate(phone="0901 234 567").phone == "0901234567"
    assert StoreSettingsUpdate(phone="+84901234567").phone == "+84901234567"
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(phone="12345")
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(phone="0901234567890")


def test_store_settings_rejects_a_negative_shipping_fee():
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(base_shipping_fee=-1)


def test_store_settings_rejects_formatted_money_strings():
    """`"35.000"` must never be written to a DECIMAL(15,0) column."""
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(base_shipping_fee="35.000")


def test_store_settings_rejects_fractional_amounts():
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(free_shipping_threshold=500000.5)


def test_store_settings_does_not_compare_fee_against_threshold():
    """The two values answer different questions; no ordering is enforced."""
    settings = StoreSettingsUpdate(base_shipping_fee=500000, free_shipping_threshold=1000)
    assert settings.base_shipping_fee == Decimal(500000)


def test_store_settings_rejects_an_unknown_payment_method():
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(payment_methods=[{"code": "paypal", "enabled": True}])


def test_store_settings_rejects_an_unknown_shipping_partner():
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(shipping_partners=[{"code": "best", "enabled": True}])


def test_store_settings_rejects_duplicate_codes():
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(
            payment_methods=[
                {"code": "cod", "enabled": True},
                {"code": "cod", "enabled": False},
            ]
        )


def test_store_settings_rejects_unknown_fields():
    """Integration secrets have no place in the settings payload."""
    with pytest.raises(ValidationError):
        StoreSettingsUpdate(api_secret="hunter2")


def test_store_settings_partial_address_only_sets_given_segments():
    settings = StoreSettingsUpdate(warehouse_address={"detail": "12 Nguyen Hue"})
    assert settings.warehouse_address.ward is None
    dumped = settings.model_dump(exclude_unset=True)
    assert set(dumped["warehouse_address"]) == {"detail"}
