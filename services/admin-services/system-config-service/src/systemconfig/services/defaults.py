"""Default option catalog for the store configuration.

Everything starts disabled — no gateway or carrier integration exists yet, so
nothing is offered to customers before an administrator turns it on.

Extending the lists only needs an enum member plus a tuple here: the missing row
is materialised in the database on the next read, no schema change.
"""

from __future__ import annotations

from systemconfig.models import PaymentMethodCode, ShippingPartnerCode

PAYMENT_METHOD_DEFAULTS: tuple[tuple[PaymentMethodCode, str, str | None, bool], ...] = (
    (PaymentMethodCode.COD, "COD", "Thanh toán khi nhận hàng", False),
    (PaymentMethodCode.CARD, "Credit / Debit Card", "Visa, Mastercard", False),
    (PaymentMethodCode.MOMO, "MoMo", "Ví điện tử MoMo", False),
    (PaymentMethodCode.ZALOPAY, "ZaloPay", "Ví điện tử ZaloPay", False),
    (PaymentMethodCode.VNPAY, "VNPay", "Cổng thanh toán VNPay", False),
    (PaymentMethodCode.BANK_TRANSFER, "Bank Transfer", "Chuyển khoản ngân hàng", False),
)

SHIPPING_PARTNER_DEFAULTS: tuple[tuple[ShippingPartnerCode, str, str | None, bool], ...] = (
    (ShippingPartnerCode.GHTK, "GHTK", "Giao Hàng Tiết Kiệm", False),
    (ShippingPartnerCode.GHN, "GHN", "Giao Hàng Nhanh", False),
    (ShippingPartnerCode.JNT, "J&T Express", None, False),
    (ShippingPartnerCode.VIETTELPOST, "ViettelPost", None, False),
)

__all__ = ["PAYMENT_METHOD_DEFAULTS", "SHIPPING_PARTNER_DEFAULTS"]
