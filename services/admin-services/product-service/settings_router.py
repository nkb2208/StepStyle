"""System settings endpoints, exposed alongside the product catalog on port 4008.

The same three `caidat*` tables are owned by ``system-config-service`` (port
4004); this router mirrors its public API under ``/api/v1/settings`` so the
admin product backend can read and update the store configuration from the
single Swagger UI at ``http://localhost:4008/docs``.

Rules kept identical to ``system-config-service``:

* the store singleton and the option catalog are created lazily with defaults;
* disabling a payment method / carrier only flips ``kich_hoat`` — rows are
  never deleted;
* ``/public`` is unauthenticated and only exposes *enabled* options;
* every other route requires an ``ADMIN`` bearer token.
"""

from __future__ import annotations

import re
from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy.orm import Session

from database import SessionLocal
from models import CaiDatCuaHang, CaiDatDoiTacVanChuyen, CaiDatPhuongThucThanhToan
from security import require_admin

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])

READ = [Depends(require_admin)]
UPDATE = [Depends(require_admin)]

# ── Default option catalog (all disabled until an admin enables them) ────────

PAYMENT_METHOD_DEFAULTS: tuple[tuple[str, str, str | None, bool], ...] = (
    ("cod", "COD", "Thanh toán khi nhận hàng", False),
    ("card", "Credit / Debit Card", "Visa, Mastercard", False),
    ("momo", "MoMo", "Ví điện tử MoMo", False),
    ("zalopay", "ZaloPay", "Ví điện tử ZaloPay", False),
    ("vnpay", "VNPay", "Cổng thanh toán VNPay", False),
    ("bank_transfer", "Bank Transfer", "Chuyển khoản ngân hàng", False),
)

SHIPPING_PARTNER_DEFAULTS: tuple[tuple[str, str, str | None, bool], ...] = (
    ("ghtk", "GHTK", "Giao Hàng Tiết Kiệm", False),
    ("ghn", "GHN", "Giao Hàng Nhanh", False),
    ("jnt", "J&T Express", None, False),
    ("viettelpost", "ViettelPost", None, False),
)

PHONE_PATTERN = re.compile(r"^(?:\+84|0)\d{8,10}$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ── Schemas ──────────────────────────────────────────────────────────────────


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class WarehouseAddressUpdate(_Strict):
    """Warehouse address segments: only the keys present in the payload change."""

    detail: str | None = Field(None, max_length=255)
    ward: str | None = Field(None, max_length=100)
    district: str | None = Field(None, max_length=100)
    province: str | None = Field(None, max_length=100)

    @field_validator("detail", "ward", "district", "province", mode="before")
    @classmethod
    def blank_clears_segment(cls, value: Any) -> Any:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class WarehouseAddress(_Strict):
    detail: str | None = None
    ward: str | None = None
    district: str | None = None
    province: str | None = None


class StoreSettingsUpdate(_Strict):
    """Partial update: fields left out keep their current value."""

    store_name: str | None = Field(None, min_length=1, max_length=255)
    contact_email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=20)
    warehouse_address: WarehouseAddressUpdate | None = None
    base_shipping_fee: Decimal | None = Field(None, ge=0)
    free_shipping_threshold: Decimal | None = Field(None, ge=0)

    @field_validator("contact_email", mode="before")
    @classmethod
    def blank_email_is_unset(cls, value: Any) -> Any:
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("contact_email", mode="after")
    @classmethod
    def check_email(cls, value: str | None) -> str | None:
        if value is not None and not EMAIL_PATTERN.match(value):
            raise ValueError("must be a valid email address")
        return value

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, value: Any) -> Any:
        # Whitespace is the only thing normalised ("0901 234 567" → "0901234567").
        if isinstance(value, str):
            return "".join(value.split()) or None
        return value

    @field_validator("phone", mode="after")
    @classmethod
    def check_phone(cls, value: str | None) -> str | None:
        if value is not None and not PHONE_PATTERN.match(value):
            raise ValueError("must be a Vietnamese phone number, e.g. 0901234567")
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


class PaymentMethodUpdate(_Strict):
    enabled: bool | None = None
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=255)

    @model_validator(mode="after")
    def check_payload(self) -> PaymentMethodUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        for name in ("enabled", "name"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class ShippingPartnerUpdate(_Strict):
    enabled: bool | None = None
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=255)

    @model_validator(mode="after")
    def check_payload(self) -> ShippingPartnerUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        for name in ("enabled", "name"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


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


class PublicOption(_Strict):
    code: str
    name: str
    description: str | None = None


class StorefrontSettingsResponse(_Strict):
    store_name: str
    base_shipping_fee: int
    free_shipping_threshold: int
    payment_methods: list[PublicOption]
    shipping_partners: list[PublicOption]


# ── Persistence helpers ──────────────────────────────────────────────────────


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_payment_methods(db: Session, settings_id: int) -> bool:
    rows = (
        db.query(CaiDatPhuongThucThanhToan)
        .filter(CaiDatPhuongThucThanhToan.ma_cai_dat == settings_id)
        .all()
    )
    existing = {row.code_phuong_thuc for row in rows}
    added = False
    for code, name, description, enabled in PAYMENT_METHOD_DEFAULTS:
        if code not in existing:
            db.add(
                CaiDatPhuongThucThanhToan(
                    ma_cai_dat=settings_id,
                    code_phuong_thuc=code,
                    ten_phuong_thuc=name,
                    mo_ta=description,
                    kich_hoat=enabled,
                )
            )
            added = True
    if added:
        db.flush()
    return added


def _ensure_shipping_partners(db: Session, settings_id: int) -> bool:
    rows = (
        db.query(CaiDatDoiTacVanChuyen)
        .filter(CaiDatDoiTacVanChuyen.ma_cai_dat == settings_id)
        .all()
    )
    existing = {row.code_doi_tac for row in rows}
    added = False
    for code, name, description, enabled in SHIPPING_PARTNER_DEFAULTS:
        if code not in existing:
            db.add(
                CaiDatDoiTacVanChuyen(
                    ma_cai_dat=settings_id,
                    code_doi_tac=code,
                    ten_doi_tac=name,
                    mo_ta=description,
                    kich_hoat=enabled,
                )
            )
            added = True
    if added:
        db.flush()
    return added


def _get_or_create_store(db: Session) -> CaiDatCuaHang:
    """Store singleton, created with the DDL defaults on first access."""
    store = db.query(CaiDatCuaHang).order_by(CaiDatCuaHang.ma_cai_dat).first()
    changed = False
    if store is None:
        store = CaiDatCuaHang(
            ten_cua_hang="Not configured",
            phi_van_chuyen_co_ban=Decimal(35000),
            nguong_mien_phi_van_chuyen=Decimal(500000),
        )
        db.add(store)
        db.flush()
        changed = True

    changed = _ensure_payment_methods(db, store.ma_cai_dat) or changed
    changed = _ensure_shipping_partners(db, store.ma_cai_dat) or changed

    if changed:
        db.commit()
        db.refresh(store)
    return store


def _store_to_dict(row: CaiDatCuaHang) -> dict[str, Any]:
    return {
        "store_name": row.ten_cua_hang,
        "contact_email": row.email_lien_he,
        "phone": row.so_dien_thoai,
        "warehouse_address": {
            "detail": row.dia_chi_kho,
            "ward": row.phuong_xa,
            "district": row.quan_huyen,
            "province": row.tinh_thanh,
        },
        "base_shipping_fee": int(row.phi_van_chuyen_co_ban),
        "free_shipping_threshold": int(row.nguong_mien_phi_van_chuyen),
        "created_at": row.ngay_tao,
        "updated_at": row.ngay_cap_nhat,
    }


def _payment_method_to_dict(row: CaiDatPhuongThucThanhToan) -> dict[str, Any]:
    return {
        "id": row.ma_cai_dat_phuong_thuc,
        "code": row.code_phuong_thuc,
        "name": row.ten_phuong_thuc,
        "description": row.mo_ta,
        "enabled": bool(row.kich_hoat),
    }


def _shipping_partner_to_dict(row: CaiDatDoiTacVanChuyen) -> dict[str, Any]:
    return {
        "id": row.ma_cai_dat_doi_tac,
        "code": row.code_doi_tac,
        "name": row.ten_doi_tac,
        "description": row.mo_ta,
        "enabled": bool(row.kich_hoat),
    }


def _public_option_to_dict(
    row: CaiDatPhuongThucThanhToan | CaiDatDoiTacVanChuyen,
) -> dict[str, Any]:
    if isinstance(row, CaiDatPhuongThucThanhToan):
        code, name = row.code_phuong_thuc, row.ten_phuong_thuc
    else:
        code, name = row.code_doi_tac, row.ten_doi_tac
    return {"code": code, "name": name, "description": row.mo_ta}


# ── Public storefront ────────────────────────────────────────────────────────


@router.get(
    "/public",
    response_model=StorefrontSettingsResponse,
    summary="Public storefront configuration (enabled options only)",
)
def get_public_settings(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Non-sensitive configuration for the customer-facing storefront.

    Deliberately unauthenticated: it exposes only the store name, the shipping
    rules and the *enabled* payment methods / carriers.
    """
    store = _get_or_create_store(db)
    methods = (
        db.query(CaiDatPhuongThucThanhToan)
        .filter(CaiDatPhuongThucThanhToan.ma_cai_dat == store.ma_cai_dat)
        .order_by(CaiDatPhuongThucThanhToan.ma_cai_dat_phuong_thuc)
        .all()
    )
    partners = (
        db.query(CaiDatDoiTacVanChuyen)
        .filter(CaiDatDoiTacVanChuyen.ma_cai_dat == store.ma_cai_dat)
        .order_by(CaiDatDoiTacVanChuyen.ma_cai_dat_doi_tac)
        .all()
    )
    return {
        "store_name": store.ten_cua_hang,
        "base_shipping_fee": int(store.phi_van_chuyen_co_ban),
        "free_shipping_threshold": int(store.nguong_mien_phi_van_chuyen),
        "payment_methods": [
            _public_option_to_dict(method) for method in methods if method.kich_hoat
        ],
        "shipping_partners": [
            _public_option_to_dict(partner) for partner in partners if partner.kich_hoat
        ],
    }


# ── Store information ────────────────────────────────────────────────────────


@router.get(
    "/store",
    dependencies=READ,
    response_model=StoreSettingsResponse,
    summary="Read the store configuration",
)
def get_store_settings(db: Session = Depends(get_db)) -> dict[str, Any]:
    return _store_to_dict(_get_or_create_store(db))


@router.put(
    "/store",
    dependencies=UPDATE,
    response_model=StoreSettingsResponse,
    summary="Update the store configuration",
)
def update_store_settings(
    payload: StoreSettingsUpdate, db: Session = Depends(get_db)
) -> dict[str, Any]:
    """Partial update: fields left out keep their current value."""
    store = _get_or_create_store(db)
    data = payload.model_dump(exclude_unset=True)

    if "store_name" in data:
        store.ten_cua_hang = data["store_name"]
    if "contact_email" in data:
        store.email_lien_he = data["contact_email"]
    if "phone" in data:
        store.so_dien_thoai = data["phone"]
    if "base_shipping_fee" in data:
        store.phi_van_chuyen_co_ban = data["base_shipping_fee"]
    if "free_shipping_threshold" in data:
        store.nguong_mien_phi_van_chuyen = data["free_shipping_threshold"]

    address = data.get("warehouse_address")
    if address is not None:
        if "detail" in address:
            store.dia_chi_kho = address["detail"]
        if "ward" in address:
            store.phuong_xa = address["ward"]
        if "district" in address:
            store.quan_huyen = address["district"]
        if "province" in address:
            store.tinh_thanh = address["province"]

    db.commit()
    db.refresh(store)
    return _store_to_dict(store)


# ── Payment methods ──────────────────────────────────────────────────────────


@router.get(
    "/payment-methods",
    dependencies=READ,
    response_model=list[PaymentMethodResponse],
    summary="List the payment methods of the store",
)
def list_payment_methods(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    store = _get_or_create_store(db)
    methods = (
        db.query(CaiDatPhuongThucThanhToan)
        .filter(CaiDatPhuongThucThanhToan.ma_cai_dat == store.ma_cai_dat)
        .order_by(CaiDatPhuongThucThanhToan.ma_cai_dat_phuong_thuc)
        .all()
    )
    return [_payment_method_to_dict(method) for method in methods]


@router.put(
    "/payment-methods/{method_id}",
    dependencies=UPDATE,
    response_model=PaymentMethodResponse,
    summary="Enable/disable a payment method",
)
def update_payment_method(
    payload: PaymentMethodUpdate,
    method_id: int = Path(..., ge=1, description="`ma_cai_dat_phuong_thuc`"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    store = _get_or_create_store(db)
    method = (
        db.query(CaiDatPhuongThucThanhToan)
        .filter(
            CaiDatPhuongThucThanhToan.ma_cai_dat == store.ma_cai_dat,
            CaiDatPhuongThucThanhToan.ma_cai_dat_phuong_thuc == method_id,
        )
        .first()
    )
    if method is None:
        raise HTTPException(status_code=404, detail="Payment method not found")

    data = payload.model_dump(exclude_unset=True)
    if "enabled" in data:
        method.kich_hoat = data["enabled"]
    if "name" in data:
        method.ten_phuong_thuc = data["name"]
    if "description" in data:
        method.mo_ta = data["description"]

    db.commit()
    db.refresh(method)
    return _payment_method_to_dict(method)


# ── Shipping partners ────────────────────────────────────────────────────────


@router.get(
    "/shipping-partners",
    dependencies=READ,
    response_model=list[ShippingPartnerResponse],
    summary="List the shipping carriers of the store",
)
def list_shipping_partners(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    store = _get_or_create_store(db)
    partners = (
        db.query(CaiDatDoiTacVanChuyen)
        .filter(CaiDatDoiTacVanChuyen.ma_cai_dat == store.ma_cai_dat)
        .order_by(CaiDatDoiTacVanChuyen.ma_cai_dat_doi_tac)
        .all()
    )
    return [_shipping_partner_to_dict(partner) for partner in partners]


@router.put(
    "/shipping-partners/{partner_id}",
    dependencies=UPDATE,
    response_model=ShippingPartnerResponse,
    summary="Enable/disable a shipping carrier",
)
def update_shipping_partner(
    payload: ShippingPartnerUpdate,
    partner_id: int = Path(..., ge=1, description="`ma_cai_dat_doi_tac`"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    store = _get_or_create_store(db)
    partner = (
        db.query(CaiDatDoiTacVanChuyen)
        .filter(
            CaiDatDoiTacVanChuyen.ma_cai_dat == store.ma_cai_dat,
            CaiDatDoiTacVanChuyen.ma_cai_dat_doi_tac == partner_id,
        )
        .first()
    )
    if partner is None:
        raise HTTPException(status_code=404, detail="Shipping partner not found")

    data = payload.model_dump(exclude_unset=True)
    if "enabled" in data:
        partner.kich_hoat = data["enabled"]
    if "name" in data:
        partner.ten_doi_tac = data["name"]
    if "description" in data:
        partner.mo_ta = data["description"]

    db.commit()
    db.refresh(partner)
    return _shipping_partner_to_dict(partner)
