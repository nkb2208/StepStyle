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
