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

# ── Reusable annotated primitives ───────────────────────────────────────────

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
Name100 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
DescriptionText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]
AddressText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]
AreaText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]
# Whole VND only (the columns are DECIMAL(15,0)) and never negative.
Money = Annotated[Decimal, Field(ge=0)]

VN_PHONE_PATTERN = r"^(?:\+84|0)\d{8,10}$"
StorePhone = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=20, pattern=VN_PHONE_PATTERN)
]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


# ── Store information ───────────────────────────────────────────────────────


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


class WarehouseAddress(_Strict):
    """Primary warehouse address, structured in four segments."""

    detail: str | None = None
    ward: str | None = None
    district: str | None = None
    province: str | None = None


class StoreSettingsUpdate(_Strict):
    """Partial update of the store settings: fields left out keep their value."""

    store_name: ShortText | None = None
    contact_email: EmailStr | None = None
    phone: StorePhone | None = None
    warehouse_address: WarehouseAddressUpdate | None = None
    base_shipping_fee: Money | None = None
    free_shipping_threshold: Money | None = None

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


# ── Payment methods ─────────────────────────────────────────────────────────


class PaymentMethodUpdate(_Strict):
    """Update of one payment method, addressed by its database id.

    Only the fields present in the payload change; the method is never deleted
    when it is disabled.
    """

    enabled: bool | None = None
    name: Name100 | None = None
    description: DescriptionText | None = None

    @model_validator(mode="after")
    def check_payload(self) -> PaymentMethodUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        for name in ("enabled", "name"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


# ── Shipping partners ───────────────────────────────────────────────────────


class ShippingPartnerUpdate(_Strict):
    """Update of one shipping carrier, addressed by its database id."""

    enabled: bool | None = None
    name: Name100 | None = None
    description: DescriptionText | None = None

    @model_validator(mode="after")
    def check_payload(self) -> ShippingPartnerUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        for name in ("enabled", "name"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


# ── Responses ───────────────────────────────────────────────────────────────


class StoreSettingsResponse(_Strict):
    store_name: str
    contact_email: str | None = None
    phone: str | None = None
    warehouse_address: WarehouseAddress
    base_shipping_fee: int
    free_shipping_threshold: int
    created_at: datetime
    updated_at: datetime


class PaymentMethodResponse(_Strict):
    id: int
    code: str
    name: str
    description: str | None = None
    enabled: bool


class ShippingPartnerResponse(_Strict):
    id: int
    code: str
    name: str
    description: str | None = None
    enabled: bool
