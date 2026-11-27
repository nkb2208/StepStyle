"""HTTP clients cho API contract của After-Sales Service:
- Order Service (Service 4): xác minh chủ đơn hàng và sản phẩm đã mua (fail-closed)
- Catalog & Search Service (Service 3): đẩy metrics đánh giá tối ưu tìm kiếm (best-effort)
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)


class OrderContractError(APIException):
    """Lỗi trả về từ hợp đồng xác minh đơn hàng với Order Service."""

    def __init__(self, detail: str, code: str, status_code: int) -> None:
        self.status_code = status_code
        super().__init__(detail={"detail": detail, "code": code}, code=code)


_REASON_STATUS_MAP: dict[str, int] = {
    "ORDER_NOT_FOUND": status.HTTP_404_NOT_FOUND,
    "NOT_ORDER_OWNER": status.HTTP_403_FORBIDDEN,
    "PRODUCT_NOT_IN_ORDER": status.HTTP_403_FORBIDDEN,
    "VARIANT_NOT_IN_ORDER": status.HTTP_403_FORBIDDEN,
    "ORDER_NOT_DELIVERED": status.HTTP_400_BAD_REQUEST,
    "UNAUTHORIZED_INTERNAL_CALL": status.HTTP_502_BAD_GATEWAY,
}


def verify_order_purchase(
    *,
    ma_don_hang: int,
    ma_nguoi_dung: int,
    ma_san_pham: int | None = None,
    ma_bien_the: int | None = None,
    require_delivered: bool = True,
) -> dict[str, Any]:
    """Gọi Order Service để xác minh đơn hàng thuộc đúng người dùng và chứa sản phẩm/biến thể.

    Contract endpoint:
        GET {ORDER_SERVICE_URL}/api/internal/orders/{ma_don_hang}/verify-purchase
    """
    base_url = getattr(settings, "ORDER_SERVICE_URL", "http://127.0.0.1:8000").rstrip("/")
    timeout = float(getattr(settings, "ORDER_SERVICE_TIMEOUT", 5.0))
    internal_api_key = getattr(settings, "INTERNAL_API_KEY", "")

    params: dict[str, str] = {
        "ma_nguoi_dung": str(ma_nguoi_dung),
        "require_delivered": "true" if require_delivered else "false",
    }
    if ma_san_pham is not None:
        params["ma_san_pham"] = str(ma_san_pham)
    if ma_bien_the is not None:
        params["ma_bien_the"] = str(ma_bien_the)

    url = f"{base_url}/api/internal/orders/{ma_don_hang}/verify-purchase?{urllib.parse.urlencode(params)}"
    headers = {
        "Accept": "application/json",
        "X-Internal-Service": "after-sales-service",
    }
    if internal_api_key:
        headers["X-Internal-Api-Key"] = internal_api_key

    req = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw_body = resp.read().decode("utf-8")
            http_status = resp.status
    except urllib.error.HTTPError as exc:
        raw_body = exc.read().decode("utf-8", errors="replace")
        http_status = exc.code
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise OrderContractError(
            detail=f"Không thể kết nối tới Order Service để xác minh đơn hàng ({exc}). Vui lòng thử lại sau.",
            code="ORDER_SERVICE_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        ) from exc

    try:
        payload = json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError as exc:
        raise OrderContractError(
            detail="Order Service trả về phản hồi không hợp lệ.",
            code="ORDER_SERVICE_INVALID_RESPONSE",
            status_code=status.HTTP_502_BAD_GATEWAY,
        ) from exc

    if http_status == status.HTTP_404_NOT_FOUND or payload.get("reason_code") == "ORDER_NOT_FOUND":
        raise OrderContractError(
            detail=payload.get("message") or "Không tìm thấy đơn hàng.",
            code="ORDER_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    if http_status == status.HTTP_422_UNPROCESSABLE_ENTITY:
        raise OrderContractError(
            detail=payload.get("message") or "Tham số xác minh đơn hàng không hợp lệ.",
            code="INVALID_VERIFICATION_PARAMS",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if http_status >= 500:
        raise OrderContractError(
            detail="Order Service gặp lỗi nội bộ khi xác minh đơn hàng.",
            code="ORDER_SERVICE_ERROR",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if not payload.get("eligible", False):
        reason_code = str(payload.get("reason_code") or "ORDER_VERIFICATION_FAILED")
        message = str(payload.get("message") or "Đơn hàng không đủ điều kiện thực hiện thao tác này.")
        mapped_status = _REASON_STATUS_MAP.get(reason_code, status.HTTP_403_FORBIDDEN)
        raise OrderContractError(detail=message, code=reason_code, status_code=mapped_status)

    return payload


def sync_product_review_metrics(
    *,
    ma_san_pham: int,
    new_avg_rating: float,
    review_count_delta: int,
    sold_count_delta: int = 0,
) -> dict[str, Any]:
    """Đẩy dữ liệu đánh giá sản phẩm sang Catalog & Search Service (best-effort).

    Contract endpoint:
        POST {CATALOG_SERVICE_URL}/api/v1/internal/products/{ma_san_pham}/metrics
        Body: {"newAvgRating": float, "reviewCountDelta": int, "soldCountDelta": int}

    Không raise exception nếu Catalog Service không khả dụng để tránh gián đoạn thao tác đánh giá của khách hàng.
    """
    if not getattr(settings, "CATALOG_SYNC_ENABLED", True):
        return {"synced": False, "skipped": True, "reason": "CATALOG_SYNC_DISABLED"}

    base_url = getattr(settings, "CATALOG_SERVICE_URL", "").rstrip("/")
    if not base_url:
        return {"synced": False, "skipped": True, "reason": "CATALOG_SERVICE_URL_EMPTY"}

    timeout = float(getattr(settings, "CATALOG_SERVICE_TIMEOUT", 3.0))
    url = f"{base_url}/api/v1/internal/products/{ma_san_pham}/metrics"
    body_dict = {
        "newAvgRating": round(max(0.0, min(5.0, float(new_avg_rating))), 2),
        "reviewCountDelta": int(review_count_delta),
        "soldCountDelta": int(sold_count_delta),
    }
    data_bytes = json.dumps(body_dict).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Internal-Service": "after-sales-service",
    }
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw_body = resp.read().decode("utf-8", errors="replace")
            http_status = resp.status
        parsed = json.loads(raw_body) if raw_body else {}
        logger.info(
            "Đồng bộ review metrics sang Catalog Service thành công (ma_san_pham=%s, avg=%s, delta=%s).",
            ma_san_pham,
            body_dict["newAvgRating"],
            body_dict["reviewCountDelta"],
        )
        return {"synced": True, "status_code": http_status, "data": parsed}
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")[:300]
        logger.warning(
            "Catalog Service trả về HTTP %s khi đồng bộ metrics ma_san_pham=%s: %s",
            exc.code,
            ma_san_pham,
            err_body,
        )
        return {"synced": False, "status_code": exc.code, "error": err_body}
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        logger.warning(
            "Không thể đồng bộ review metrics sang Catalog Service cho ma_san_pham=%s (best-effort): %s",
            ma_san_pham,
            exc,
        )
        return {"synced": False, "status_code": None, "error": str(exc)}
