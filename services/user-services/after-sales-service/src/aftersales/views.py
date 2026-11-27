from django.db import IntegrityError
from django.db.models import Avg, Count
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .clients import sync_product_review_metrics, verify_order_purchase
from .models import DanhGia, YeuCauHauMai
from .serializers import (
    DanhGiaCreateSerializer,
    DanhGiaSerializer,
    DanhGiaUpdateSerializer,
    ProductReviewSummarySerializer,
    YeuCauHauMaiCreateSerializer,
    YeuCauHauMaiProcessSerializer,
    YeuCauHauMaiSerializer,
    YeuCauHauMaiUpdateSerializer,
)

VALID_ROLES = {"CUSTOMER", "ADMIN"}

OWNER_ONLY_PARAMS = [
    OpenApiParameter(
        name="X-User-Id",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.HEADER,
        required=False,
        description="ID người dùng chính chủ (bắt buộc truyền qua header X-User-Id hoặc query param ma_nguoi_dung)",
    ),
    OpenApiParameter(
        name="ma_nguoi_dung",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
        required=False,
        description="Tuỳ chọn thay thế cho header X-User-Id để xác minh chính chủ khi test nhanh",
    ),
]

ACTOR_OR_ADMIN_PARAMS = [
    OpenApiParameter(
        name="X-User-Id",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.HEADER,
        required=False,
        description="ID người dùng thực hiện (dùng kiểm tra chính chủ với khách hàng)",
    ),
    OpenApiParameter(
        name="X-User-Role",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.HEADER,
        required=False,
        enum=["CUSTOMER", "ADMIN"],
        description="Vai trò người thực hiện (mặc định CUSTOMER; ADMIN có quyền quản trị)",
    ),
    OpenApiParameter(
        name="ma_nguoi_dung",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
        required=False,
        description="Tuỳ chọn thay thế cho header X-User-Id để kiểm tra chính chủ khi test nhanh",
    ),
]

ADMIN_HEADER = [
    OpenApiParameter(
        name="X-User-Role",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.HEADER,
        required=True,
        enum=["ADMIN"],
        description="Bắt buộc truyền ADMIN",
    ),
]


def _parse_optional_int(raw_value, field_name: str) -> int | None:
    if raw_value is None or str(raw_value).strip() == "":
        return None
    try:
        parsed = int(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({field_name: f"Giá trị '{field_name}' phải là số nguyên dương."}) from exc
    if parsed < 1:
        raise ValidationError({field_name: f"Giá trị '{field_name}' phải lớn hơn hoặc bằng 1."})
    return parsed


def _resolve_actor(request) -> tuple[int | None, str]:
    raw_role = (request.headers.get("X-User-Role") or "CUSTOMER").strip().upper()
    if raw_role not in VALID_ROLES:
        raise ValidationError({"X-User-Role": "Vai trò không hợp lệ. Chỉ chấp nhận CUSTOMER hoặc ADMIN."})

    header_user = _parse_optional_int(request.headers.get("X-User-Id"), "X-User-Id")
    query_user = _parse_optional_int(request.query_params.get("ma_nguoi_dung"), "ma_nguoi_dung")
    if header_user is not None and query_user is not None and header_user != query_user:
        raise PermissionDenied("X-User-Id và ma_nguoi_dung không khớp.")

    actor_id = header_user if header_user is not None else query_user
    return actor_id, raw_role


def _assert_owner_only(request, owner_user_id: int) -> int:
    """Chỉ duy nhất chính chủ mới được phép thực hiện (kể cả ADMIN cũng không được thao tác hộ)."""
    actor_id, _ = _resolve_actor(request)
    if actor_id is None:
        raise PermissionDenied(
            "Vui lòng truyền header X-User-Id (hoặc query param ma_nguoi_dung) để xác minh chính chủ."
        )
    if actor_id != owner_user_id:
        raise PermissionDenied("Chỉ chính chủ tài khoản tạo dữ liệu này mới có quyền thực hiện thao tác này.")
    return actor_id


def _assert_owner_or_admin(request, owner_user_id: int) -> tuple[int | None, str]:
    actor_id, role = _resolve_actor(request)
    if role == "ADMIN":
        return actor_id, role

    if actor_id is None:
        raise PermissionDenied(
            "Vui lòng truyền header X-User-Id (hoặc query param ma_nguoi_dung) để xác minh chính chủ, "
            "hoặc X-User-Role: ADMIN."
        )
    if actor_id != owner_user_id:
        raise PermissionDenied("Bạn không có quyền thao tác trên dữ liệu của người dùng khác.")
    return actor_id, role


def _assert_admin(request) -> str:
    _, role = _resolve_actor(request)
    if role != "ADMIN":
        raise PermissionDenied("Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này.")
    return role


@extend_schema_view(
    list=extend_schema(
        summary="Lấy danh sách đánh giá (hỗ trợ lọc)",
        parameters=[
            OpenApiParameter("ma_san_pham", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Lọc theo mã sản phẩm"),
            OpenApiParameter("ma_nguoi_dung", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Lọc theo mã người dùng"),
            OpenApiParameter("ma_don_hang", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Lọc theo mã đơn hàng"),
            OpenApiParameter("so_sao", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Lọc theo số sao (1-5)"),
        ],
    ),
    retrieve=extend_schema(summary="Lấy chi tiết 1 đánh giá theo mã"),
    update=extend_schema(
        summary="Cập nhật số sao và nội dung đánh giá (chỉ chính chủ)",
        parameters=OWNER_ONLY_PARAMS,
        request=DanhGiaUpdateSerializer,
        responses=DanhGiaSerializer,
    ),
    destroy=extend_schema(
        summary="Xóa đánh giá theo mã (chỉ chính chủ, không cho phép bất kỳ tài khoản nào khác)",
        parameters=OWNER_ONLY_PARAMS,
    ),
)
@extend_schema(tags=["1. Feedback (Đánh giá sản phẩm)"])
class DanhGiaViewSet(viewsets.ModelViewSet):
    queryset = DanhGia.objects.all().order_by("-ma_danh_gia")
    serializer_class = DanhGiaSerializer
    http_method_names = ["get", "post", "put", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        ma_san_pham = _parse_optional_int(self.request.query_params.get("ma_san_pham"), "ma_san_pham")
        ma_nguoi_dung = _parse_optional_int(self.request.query_params.get("ma_nguoi_dung"), "ma_nguoi_dung")
        ma_don_hang = _parse_optional_int(self.request.query_params.get("ma_don_hang"), "ma_don_hang")
        so_sao = _parse_optional_int(self.request.query_params.get("so_sao"), "so_sao")

        if ma_san_pham is not None:
            qs = qs.filter(ma_san_pham=ma_san_pham)
        if ma_nguoi_dung is not None:
            qs = qs.filter(ma_nguoi_dung=ma_nguoi_dung)
        if ma_don_hang is not None:
            qs = qs.filter(ma_don_hang=ma_don_hang)
        if so_sao is not None:
            if so_sao > 5:
                raise ValidationError({"so_sao": "Số sao phải nằm trong khoảng từ 1 đến 5."})
            qs = qs.filter(so_sao=so_sao)
        return qs

    def _push_catalog_metrics(self, ma_san_pham: int, *, review_count_delta: int) -> None:
        agg = DanhGia.objects.filter(ma_san_pham=ma_san_pham).aggregate(avg_rating=Avg("so_sao"))
        avg_rating = round(float(agg["avg_rating"] or 0.0), 2)
        sync_product_review_metrics(
            ma_san_pham=ma_san_pham,
            new_avg_rating=avg_rating,
            review_count_delta=review_count_delta,
            sold_count_delta=0,
        )

    @extend_schema(
        summary="Tạo đánh giá mới (xác minh chủ đơn & sản phẩm qua Order Service, đẩy metrics về Catalog Service)",
        parameters=[OWNER_ONLY_PARAMS[0]],
        request=DanhGiaCreateSerializer,
        responses={201: DanhGiaSerializer},
    )
    def create(self, request, *args, **kwargs):
        serializer = DanhGiaCreateSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        # Nếu client gửi kèm X-User-Id header thì bắt buộc khớp với ma_nguoi_dung trong body
        header_user = _parse_optional_int(request.headers.get("X-User-Id"), "X-User-Id")
        if header_user is not None and header_user != validated["ma_nguoi_dung"]:
            raise PermissionDenied("Header X-User-Id không khớp với ma_nguoi_dung trong yêu cầu.")

        # Xác minh qua API contract của Order Service: đúng chủ đơn + DELIVERED + có sản phẩm này
        verify_order_purchase(
            ma_don_hang=validated["ma_don_hang"],
            ma_nguoi_dung=validated["ma_nguoi_dung"],
            ma_san_pham=validated["ma_san_pham"],
            require_delivered=True,
        )

        # Kiểm tra trùng đánh giá cho (ma_don_hang, ma_san_pham) trước khi lưu
        if DanhGia.objects.filter(
            ma_don_hang=validated["ma_don_hang"],
            ma_san_pham=validated["ma_san_pham"],
        ).exists():
            return Response(
                {
                    "detail": "Sản phẩm trong đơn hàng này đã được đánh giá trước đó.",
                    "code": "REVIEW_ALREADY_EXISTS",
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:
            instance = serializer.save()
        except IntegrityError:
            return Response(
                {
                    "detail": "Không thể lưu đánh giá do vi phạm ràng buộc dữ liệu (trùng đánh giá hoặc khóa ngoại không hợp lệ).",
                    "code": "DATA_INTEGRITY_ERROR",
                },
                status=status.HTTP_409_CONFLICT,
            )

        # Đẩy metrics đánh giá về Catalog & Search Service (best-effort)
        self._push_catalog_metrics(instance.ma_san_pham, review_count_delta=1)

        output_serializer = DanhGiaSerializer(
            instance,
            context=self.get_serializer_context(),
        )
        headers = self.get_success_headers(output_serializer.data)
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        _assert_owner_only(request, instance.ma_nguoi_dung)
        old_stars = instance.so_sao

        serializer = DanhGiaUpdateSerializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if instance.so_sao != old_stars:
            self._push_catalog_metrics(instance.ma_san_pham, review_count_delta=0)

        return Response(DanhGiaSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        _assert_owner_only(request, instance.ma_nguoi_dung)
        product_id = instance.ma_san_pham
        instance.delete()

        self._push_catalog_metrics(product_id, review_count_delta=-1)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        summary="Thống kê điểm đánh giá trung bình theo mã sản phẩm",
        parameters=[
            OpenApiParameter(
                "ma_san_pham",
                OpenApiTypes.INT,
                OpenApiParameter.QUERY,
                required=True,
                description="Mã sản phẩm cần thống kê đánh giá",
            ),
        ],
        responses=ProductReviewSummarySerializer,
    )
    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        ma_san_pham = _parse_optional_int(request.query_params.get("ma_san_pham"), "ma_san_pham")
        if ma_san_pham is None:
            raise ValidationError({"ma_san_pham": "Vui lòng truyền query param ma_san_pham."})

        reviews_qs = DanhGia.objects.filter(ma_san_pham=ma_san_pham)
        agg = reviews_qs.aggregate(avg_rating=Avg("so_sao"), review_count=Count("ma_danh_gia"))

        breakdown = {str(star): 0 for star in range(1, 6)}
        for row in reviews_qs.values("so_sao").annotate(total=Count("ma_danh_gia")):
            breakdown[str(row["so_sao"])] = row["total"]

        data = {
            "ma_san_pham": ma_san_pham,
            "avg_rating": round(float(agg["avg_rating"] or 0.0), 2),
            "review_count": agg["review_count"] or 0,
            "rating_breakdown": breakdown,
        }
        return Response(ProductReviewSummarySerializer(data).data)


@extend_schema_view(
    list=extend_schema(
        summary="Lấy danh sách yêu cầu hậu mãi (hỗ trợ lọc)",
        parameters=[
            OpenApiParameter("ma_nguoi_dung", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Lọc theo mã người dùng"),
            OpenApiParameter("ma_don_hang", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Lọc theo mã đơn hàng"),
            OpenApiParameter(
                "loai_yeu_cau",
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                enum=["EXCHANGE", "RETURN", "SUPPORT"],
                description="Lọc theo loại yêu cầu",
            ),
            OpenApiParameter(
                "trang_thai",
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                enum=["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"],
                description="Lọc theo trạng thái xử lý",
            ),
        ],
    ),
    retrieve=extend_schema(summary="Lấy chi tiết 1 yêu cầu hậu mãi theo mã"),
    update=extend_schema(
        summary="Cập nhật yêu cầu hậu mãi khi đang PENDING (chính chủ / admin)",
        parameters=ACTOR_OR_ADMIN_PARAMS,
        request=YeuCauHauMaiUpdateSerializer,
        responses=YeuCauHauMaiSerializer,
    ),
    destroy=extend_schema(
        summary="Xóa yêu cầu hậu mãi (chỉ khi PENDING hoặc CANCELLED)",
        parameters=ACTOR_OR_ADMIN_PARAMS,
    ),
)
@extend_schema(tags=["2. After-Sales (Yêu cầu hậu mãi & Đổi trả)"])
class YeuCauHauMaiViewSet(viewsets.ModelViewSet):
    queryset = YeuCauHauMai.objects.all().order_by("-ma_yeu_cau")
    serializer_class = YeuCauHauMaiSerializer
    http_method_names = ["get", "post", "put", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        ma_nguoi_dung = _parse_optional_int(self.request.query_params.get("ma_nguoi_dung"), "ma_nguoi_dung")
        ma_don_hang = _parse_optional_int(self.request.query_params.get("ma_don_hang"), "ma_don_hang")
        loai_yeu_cau = self.request.query_params.get("loai_yeu_cau")
        trang_thai = self.request.query_params.get("trang_thai")

        if ma_nguoi_dung is not None:
            qs = qs.filter(ma_nguoi_dung=ma_nguoi_dung)
        if ma_don_hang is not None:
            qs = qs.filter(ma_don_hang=ma_don_hang)
        if loai_yeu_cau:
            normalized_type = loai_yeu_cau.strip().upper()
            if normalized_type not in {"EXCHANGE", "RETURN", "SUPPORT"}:
                raise ValidationError({"loai_yeu_cau": "Loại yêu cầu phải là EXCHANGE, RETURN hoặc SUPPORT."})
            qs = qs.filter(loai_yeu_cau=normalized_type)
        if trang_thai:
            normalized_status = trang_thai.strip().upper()
            if normalized_status not in {"PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"}:
                raise ValidationError(
                    {"trang_thai": "Trạng thái phải là PENDING, APPROVED, REJECTED, COMPLETED hoặc CANCELLED."}
                )
            qs = qs.filter(trang_thai=normalized_status)
        return qs

    @extend_schema(
        summary="Tạo yêu cầu hậu mãi mới (xác minh chủ đơn & biến thể qua Order Service)",
        parameters=[OWNER_ONLY_PARAMS[0]],
        request=YeuCauHauMaiCreateSerializer,
        responses={201: YeuCauHauMaiSerializer},
    )
    def create(self, request, *args, **kwargs):
        serializer = YeuCauHauMaiCreateSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        header_user = _parse_optional_int(request.headers.get("X-User-Id"), "X-User-Id")
        if header_user is not None and header_user != validated["ma_nguoi_dung"]:
            raise PermissionDenied("Header X-User-Id không khớp với ma_nguoi_dung trong yêu cầu.")

        # EXCHANGE và RETURN yêu cầu đơn hàng đã DELIVERED; SUPPORT chỉ cần đúng chủ đơn
        require_delivered = validated["loai_yeu_cau"] in {"EXCHANGE", "RETURN"}
        verify_order_purchase(
            ma_don_hang=validated["ma_don_hang"],
            ma_nguoi_dung=validated["ma_nguoi_dung"],
            ma_bien_the=validated.get("ma_bien_the"),
            require_delivered=require_delivered,
        )

        # Chặn trùng yêu cầu đang chờ xử lý (PENDING)
        duplicate_qs = YeuCauHauMai.objects.filter(
            ma_nguoi_dung=validated["ma_nguoi_dung"],
            ma_don_hang=validated["ma_don_hang"],
            ma_bien_the=validated.get("ma_bien_the"),
            loai_yeu_cau=validated["loai_yeu_cau"],
            trang_thai="PENDING",
        )
        if duplicate_qs.exists():
            return Response(
                {
                    "detail": "Bạn đã có một yêu cầu hậu mãi cùng loại đang chờ xử lý cho đơn hàng này.",
                    "code": "DUPLICATE_PENDING_REQUEST",
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:
            instance = serializer.save(trang_thai="PENDING", phan_hoi_nhan_vien=None)
        except IntegrityError:
            return Response(
                {
                    "detail": "Không thể tạo yêu cầu hậu mãi do khóa ngoại không hợp lệ (kiểm tra ma_bien_the / ma_bien_the_moi).",
                    "code": "INVALID_REFERENCE",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        output_serializer = YeuCauHauMaiSerializer(
            instance,
            context=self.get_serializer_context(),
        )
        headers = self.get_success_headers(output_serializer.data)
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        _assert_owner_or_admin(request, instance.ma_nguoi_dung)

        if instance.trang_thai != "PENDING":
            return Response(
                {
                    "detail": f"Chỉ có thể chỉnh sửa yêu cầu ở trạng thái PENDING (hiện tại: {instance.trang_thai}).",
                    "code": "REQUEST_NOT_EDITABLE",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = YeuCauHauMaiUpdateSerializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        new_type = validated.get("loai_yeu_cau", instance.loai_yeu_cau)
        new_variant = validated.get("ma_bien_the", instance.ma_bien_the)
        if new_type != instance.loai_yeu_cau or new_variant != instance.ma_bien_the:
            verify_order_purchase(
                ma_don_hang=instance.ma_don_hang,
                ma_nguoi_dung=instance.ma_nguoi_dung,
                ma_bien_the=new_variant,
                require_delivered=new_type in {"EXCHANGE", "RETURN"},
            )

        try:
            serializer.save()
        except IntegrityError:
            return Response(
                {
                    "detail": "Không thể cập nhật do mã biến thể không tồn tại trong hệ thống.",
                    "code": "INVALID_REFERENCE",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(YeuCauHauMaiSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        _assert_owner_or_admin(request, instance.ma_nguoi_dung)

        if instance.trang_thai not in {"PENDING", "CANCELLED"}:
            return Response(
                {
                    "detail": f"Không thể xóa yêu cầu đã xử lý ở trạng thái '{instance.trang_thai}'.",
                    "code": "REQUEST_NOT_DELETABLE",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        summary="Khách hàng hủy yêu cầu hậu mãi đang PENDING",
        parameters=ACTOR_OR_ADMIN_PARAMS,
        request=None,
        responses=YeuCauHauMaiSerializer,
    )
    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        instance = self.get_object()
        _assert_owner_or_admin(request, instance.ma_nguoi_dung)

        if instance.trang_thai != "PENDING":
            return Response(
                {
                    "detail": f"Chỉ có thể hủy yêu cầu ở trạng thái PENDING (hiện tại: {instance.trang_thai}).",
                    "code": "REQUEST_NOT_CANCELLABLE",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance.trang_thai = "CANCELLED"
        instance.save(update_fields=["trang_thai", "ngay_cap_nhat"])
        return Response(YeuCauHauMaiSerializer(instance).data)

    @extend_schema(
        summary="Admin duyệt, từ chối hoặc hoàn tất yêu cầu hậu mãi",
        parameters=ADMIN_HEADER,
        request=YeuCauHauMaiProcessSerializer,
        responses=YeuCauHauMaiSerializer,
    )
    @action(detail=True, methods=["put"], url_path="process")
    def process(self, request, pk=None):
        _assert_admin(request)
        instance = self.get_object()
        serializer = YeuCauHauMaiProcessSerializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(YeuCauHauMaiSerializer(instance).data)
