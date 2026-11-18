from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.response import Response

from .models import DanhGia, YeuCauHauMai
from .serializers import (
    DanhGiaSerializer,
    DanhGiaUpdateSerializer,
    YeuCauHauMaiSerializer,
    YeuCauHauMaiCreateSerializer,
    YeuCauHauMaiUpdateSerializer,
)


@extend_schema_view(
    list=extend_schema(summary="Lấy danh sách tất cả đánh giá"),
    create=extend_schema(summary="Tạo đánh giá mới"),
    retrieve=extend_schema(summary="Lấy chi tiết 1 đánh giá theo mã"),
    update=extend_schema(
        summary="Cập nhật số sao và nội dung đánh giá",
        request=DanhGiaUpdateSerializer,
        responses=DanhGiaSerializer,
    ),
    destroy=extend_schema(summary="Xóa đánh giá theo mã"),
)
@extend_schema(tags=["1. Feedback (Đánh giá sản phẩm)"])
class DanhGiaViewSet(viewsets.ModelViewSet):
    queryset = DanhGia.objects.all().order_by("-ma_danh_gia")
    serializer_class = DanhGiaSerializer
    http_method_names = ["get", "post", "put", "delete", "head", "options"]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = DanhGiaUpdateSerializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(DanhGiaSerializer(instance).data)


@extend_schema_view(
    list=extend_schema(summary="Lấy danh sách tất cả yêu cầu hậu mãi"),
    create=extend_schema(
        summary="Tạo yêu cầu hậu mãi mới",
        request=YeuCauHauMaiCreateSerializer,
        responses=YeuCauHauMaiSerializer,
    ),
    retrieve=extend_schema(summary="Lấy chi tiết 1 yêu cầu hậu mãi theo mã"),
    update=extend_schema(
        summary="Cập nhật loại yêu cầu và lý do",
        request=YeuCauHauMaiUpdateSerializer,
        responses=YeuCauHauMaiSerializer,
    ),
    destroy=extend_schema(summary="Xóa yêu cầu hậu mãi theo mã"),
)
@extend_schema(tags=["2. After-Sales (Yêu cầu hậu mãi & Đổi trả)"])
class YeuCauHauMaiViewSet(viewsets.ModelViewSet):
    queryset = YeuCauHauMai.objects.all().order_by("-ma_yeu_cau")
    serializer_class = YeuCauHauMaiSerializer
    http_method_names = ["get", "post", "put", "delete", "head", "options"]

    def create(self, request, *args, **kwargs):
        serializer = YeuCauHauMaiCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(trang_thai="PENDING")
        return Response(YeuCauHauMaiSerializer(instance).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = YeuCauHauMaiUpdateSerializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(YeuCauHauMaiSerializer(instance).data)