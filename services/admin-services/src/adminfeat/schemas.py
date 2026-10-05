"""Request/response schemas — English API names mapped to the Vietnamese schema."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from adminfeat.models import (
    DiscountType,
    OrderStatus,
    PaymentMethodCode,
    PaymentStatus,
    ProductStatus,
    Role,
    ShippingPartnerCode,
)

# ── Reusable annotated primitives ───────────────────────────────────────────

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
Name100 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
SizeText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20)]
ColorText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
CodeText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
UrlText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
PhoneText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20)]
OptionalText = Annotated[str | None, StringConstraints(max_length=10000)]
Money = Annotated[Decimal, Field(ge=0)]
Quantity = Annotated[int, Field(ge=1)]
Stock = Annotated[int, Field(ge=0)]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


# ── Categories ──────────────────────────────────────────────────────────────


class CategoryCreate(_Strict):
    name: ShortText
    description: OptionalText = None
    parent_id: int | None = None


class CategoryUpdate(_Strict):
    name: ShortText | None = None
    description: OptionalText = None
    parent_id: int | None = None


# ── Products ────────────────────────────────────────────────────────────────


class ProductCreate(_Strict):
    name: ShortText
    original_price: Money = Decimal(0)
    sale_price: Money | None = None
    description: OptionalText = None
    image: UrlText | None = None
    status: ProductStatus = ProductStatus.ACTIVE
    category_id: int | None = None

    @model_validator(mode="after")
    def check_prices(self) -> ProductCreate:
        if self.sale_price is not None and self.sale_price > self.original_price:
            raise ValueError("sale_price cannot be greater than original_price")
        return self


class ProductUpdate(_Strict):
    name: ShortText | None = None
    original_price: Money | None = None
    sale_price: Money | None = None
    description: OptionalText = None
    image: UrlText | None = None
    status: ProductStatus | None = None
    category_id: int | None = None

    @model_validator(mode="after")
    def check_prices(self) -> ProductUpdate:
        if (
            self.original_price is not None
            and self.sale_price is not None
            and self.sale_price > self.original_price
        ):
            raise ValueError("sale_price cannot be greater than original_price")
        return self


# ── Product variants ────────────────────────────────────────────────────────


class VariantCreate(_Strict):
    size: SizeText
    color: ColorText
    stock: Stock = 0
    image: UrlText | None = None


class VariantUpdate(_Strict):
    size: SizeText | None = None
    color: ColorText | None = None
    stock: Stock | None = None
    image: UrlText | None = None


# ── Discount codes ──────────────────────────────────────────────────────────


class DiscountCreate(_Strict):
    code: CodeText
    type: DiscountType = DiscountType.PERCENT
    value: Money = Decimal(0)
    min_order_value: Money = Decimal(0)
    max_discount: Money | None = None
    quantity: Annotated[int, Field(ge=1)] = 1
    start_date: datetime | None = None
    end_date: datetime | None = None
    active: bool = True

    @model_validator(mode="after")
    def check_rules(self) -> DiscountCreate:
        _validate_discount_rules(self.type, self.value, self.start_date, self.end_date)
        return self


class DiscountUpdate(_Strict):
    code: CodeText | None = None
    type: DiscountType | None = None
    value: Money | None = None
    min_order_value: Money | None = None
    max_discount: Money | None = None
    quantity: Annotated[int | None, Field(ge=1)] = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    active: bool | None = None


def _validate_discount_rules(
    discount_type: DiscountType | None,
    value: Decimal | None,
    start_date: datetime | None,
    end_date: datetime | None,
) -> None:
    if discount_type == DiscountType.PERCENT and value is not None and value > 100:
        raise ValueError("PERCENT discount value cannot exceed 100")
    if start_date is not None and end_date is not None and end_date <= start_date:
        raise ValueError("end_date must be after start_date")


# ── Payment methods ─────────────────────────────────────────────────────────


class PaymentMethodCreate(_Strict):
    name: Name100
    description: OptionalText = None
    active: bool = True


class PaymentMethodUpdate(_Strict):
    name: Name100 | None = None
    description: OptionalText = None
    active: bool | None = None


# ── Orders ──────────────────────────────────────────────────────────────────


class OrderItemCreate(_Strict):
    variant_id: int
    quantity: Quantity


class OrderCreate(_Strict):
    customer_id: int | None = None
    recipient_name: ShortText
    phone: PhoneText
    address: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    # Omitted → the fee is derived from the store settings (base fee / free
    # shipping threshold). Sent → the explicit amount wins, as before.
    shipping_fee: Money | None = None
    discount_id: int | None = None
    note: OptionalText = None
    items: list[OrderItemCreate] = Field(min_length=1, max_length=100)


class OrderUpdate(_Strict):
    recipient_name: ShortText | None = None
    phone: PhoneText | None = None
    address: Annotated[str | None, StringConstraints(strip_whitespace=True, min_length=1)] = None
    shipping_fee: Money | None = None
    note: OptionalText = None


class OrderStatusUpdate(_Strict):
    status: OrderStatus


# ── Payments ────────────────────────────────────────────────────────────────


class PaymentCreate(_Strict):
    order_id: int
    method_id: int | None = None
    amount: Money
    status: PaymentStatus = PaymentStatus.PENDING
    gateway_txn_id: Annotated[str | None, StringConstraints(max_length=100)] = None


class PaymentUpdate(_Strict):
    method_id: int | None = None
    amount: Money | None = None
    status: PaymentStatus | None = None
    gateway_txn_id: Annotated[str | None, StringConstraints(max_length=100)] = None


# ── Users ───────────────────────────────────────────────────────────────────


class UserCreate(_Strict):
    name: ShortText
    email: EmailStr
    password: Annotated[str, StringConstraints(min_length=8, max_length=72)]
    phone: PhoneText | None = None
    address: OptionalText = None
    role: Role = Role.CUSTOMER
    active: bool = True


class UserUpdate(_Strict):
    name: ShortText | None = None
    email: EmailStr | None = None
    phone: PhoneText | None = None
    address: OptionalText = None
    role: Role | None = None
    active: bool | None = None


class UserPasswordUpdate(_Strict):
    password: Annotated[str, StringConstraints(min_length=8, max_length=72)]


# ── Store settings ──────────────────────────────────────────────────────────

# Vietnamese numbers: 0xxxxxxxxx (10 or 11 digits) or +84xxxxxxxxx.
VN_PHONE_PATTERN = r"^(?:\+84|0)\d{8,10}$"

AddressText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]
AreaText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]
StorePhone = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=20, pattern=VN_PHONE_PATTERN)
]


class WarehouseAddressUpdate(_Strict):
    """Primary warehouse address — only the segments present in the payload change."""

    detail: AddressText | None = None
    ward: AreaText | None = None
    district: AreaText | None = None
    province: AreaText | None = None

    @field_validator("detail", "ward", "district", "province", mode="before")
    @classmethod
    def blank_clears_segment(cls, value: Any) -> Any:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class PaymentMethodSettingUpdate(_Strict):
    """Toggle of one payment method, keyed by its stable code."""

    code: PaymentMethodCode
    enabled: bool


class ShippingPartnerSettingUpdate(_Strict):
    """Toggle of one shipping carrier, keyed by its stable code."""

    code: ShippingPartnerCode
    enabled: bool


class StoreSettingsUpdate(_Strict):
    """Partial update of the store settings: fields left out keep their value."""

    store_name: ShortText | None = None
    contact_email: EmailStr | None = None
    phone: StorePhone | None = None
    warehouse_address: WarehouseAddressUpdate | None = None
    base_shipping_fee: Money | None = None
    free_shipping_threshold: Money | None = None
    payment_methods: list[PaymentMethodSettingUpdate] | None = None
    shipping_partners: list[ShippingPartnerSettingUpdate] | None = None

    @field_validator("contact_email", mode="before")
    @classmethod
    def blank_email_is_unset(cls, value: Any) -> Any:
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, value: Any) -> Any:
        # Whitespace is the only thing normalised ("0901 234 567" → "0901234567").
        if isinstance(value, str):
            return "".join(value.split()) or None
        return value

    @field_validator("base_shipping_fee", "free_shipping_threshold", mode="before")
    @classmethod
    def money_must_be_a_number(cls, value: Any) -> Any:
        # Formatted strings such as "35.000" must never reach the database.
        if isinstance(value, bool) or not isinstance(value, int | float | Decimal):
            raise ValueError("must be a number of whole VND, e.g. 35000")
        return value

    @model_validator(mode="after")
    def check_not_null(self) -> StoreSettingsUpdate:
        """Only email/phone/address segments are clearable with an explicit null."""
        for name in (
            "store_name",
            "warehouse_address",
            "base_shipping_fee",
            "free_shipping_threshold",
            "payment_methods",
            "shipping_partners",
        ):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self

    @model_validator(mode="after")
    def check_whole_amounts(self) -> StoreSettingsUpdate:
        # VND has no subdivision: the columns are DECIMAL(15, 0) integers.
        for name in ("base_shipping_fee", "free_shipping_threshold"):
            value = getattr(self, name)
            if value is not None and value != value.to_integral_value():
                raise ValueError(f"{name} must be a whole VND amount")
        return self

    @model_validator(mode="after")
    def check_unique_codes(self) -> StoreSettingsUpdate:
        for name in ("payment_methods", "shipping_partners"):
            items = getattr(self, name) or []
            codes = [item.code for item in items]
            if len(codes) != len(set(codes)):
                raise ValueError(f"{name} must not contain duplicate codes")
        return self
