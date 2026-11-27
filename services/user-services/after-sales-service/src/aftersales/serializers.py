from rest_framework import serializers

from .models import DanhGia, YeuCauHauMai

VALID_REQUEST_TRANSITIONS: dict[str, set[str]] = {
    "PENDING": {"APPROVED", "REJECTED", "CANCELLED"},
    "APPROVED": {"COMPLETED", "REJECTED"},
    "REJECTED": set(),
    "COMPLETED": set(),
    "CANCELLED": set(),
}


class DanhGiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DanhGia
        fields = "__all__"
        read_only_fields = ["ma_danh_gia", "ngay_tao", "ngay_cap_nhat"]


class DanhGiaCreateSerializer(serializers.ModelSerializer):
    ma_nguoi_dung = serializers.IntegerField(min_value=1, help_text="Mã người dùng đã đặt đơn hàng")
    ma_san_pham = serializers.IntegerField(min_value=1, help_text="Mã sản phẩm nằm trong đơn hàng")
    ma_don_hang = serializers.IntegerField(min_value=1, help_text="Mã đơn hàng đã giao (DELIVERED)")
    so_sao = serializers.IntegerField(min_value=1, max_value=5, help_text="Số sao đánh giá từ 1 đến 5")
    noi_dung = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = DanhGia
        fields = ["ma_nguoi_dung", "ma_san_pham", "ma_don_hang", "so_sao", "noi_dung"]

    def validate_noi_dung(self, value):
        if value is None:
            return None
        stripped = value.strip()
        return stripped if stripped else None


class DanhGiaUpdateSerializer(serializers.ModelSerializer):
    so_sao = serializers.IntegerField(min_value=1, max_value=5, help_text="Số sao đánh giá từ 1 đến 5")
    noi_dung = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = DanhGia
        fields = ["so_sao", "noi_dung"]

    def validate_noi_dung(self, value):
        if value is None:
            return None
        stripped = value.strip()
        return stripped if stripped else None


class ProductReviewSummarySerializer(serializers.Serializer):
    ma_san_pham = serializers.IntegerField()
    avg_rating = serializers.FloatField()
    review_count = serializers.IntegerField()
    rating_breakdown = serializers.DictField(child=serializers.IntegerField())


class YeuCauHauMaiSerializer(serializers.ModelSerializer):
    class Meta:
        model = YeuCauHauMai
        fields = "__all__"
        read_only_fields = ["ma_yeu_cau", "ngay_tao", "ngay_cap_nhat"]


class YeuCauHauMaiCreateSerializer(serializers.ModelSerializer):
    ma_nguoi_dung = serializers.IntegerField(min_value=1, help_text="Mã người dùng đã đặt đơn hàng")
    ma_don_hang = serializers.IntegerField(min_value=1, help_text="Mã đơn hàng cần yêu cầu hậu mãi")
    ma_bien_the = serializers.IntegerField(
        min_value=1,
        required=False,
        allow_null=True,
        help_text="Mã biến thể trong đơn hàng muốn đổi/trả (tuỳ chọn với SUPPORT)",
    )
    ma_bien_the_moi = serializers.IntegerField(
        min_value=1,
        required=False,
        allow_null=True,
        help_text="Mã biến thể muốn đổi sang (chỉ áp dụng cho loại EXCHANGE)",
    )
    loai_yeu_cau = serializers.ChoiceField(
        choices=["EXCHANGE", "RETURN", "SUPPORT"],
        help_text="Loại yêu cầu: EXCHANGE (đổi hàng), RETURN (trả hàng), SUPPORT (hỗ trợ)",
    )
    ly_do = serializers.CharField(help_text="Lý do gửi yêu cầu hậu mãi")

    class Meta:
        model = YeuCauHauMai
        fields = [
            "ma_nguoi_dung",
            "ma_don_hang",
            "ma_bien_the",
            "ma_bien_the_moi",
            "loai_yeu_cau",
            "ly_do",
        ]

    def validate_ly_do(self, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Lý do không được để trống.")
        return stripped

    def validate(self, attrs):
        loai = attrs.get("loai_yeu_cau")
        ma_bien_the = attrs.get("ma_bien_the")
        ma_bien_the_moi = attrs.get("ma_bien_the_moi")

        if loai != "EXCHANGE" and ma_bien_the_moi is not None:
            raise serializers.ValidationError(
                {"ma_bien_the_moi": "Trường ma_bien_the_moi chỉ được sử dụng cho yêu cầu loại EXCHANGE."}
            )
        if loai == "EXCHANGE" and ma_bien_the is not None and ma_bien_the_moi is not None:
            if ma_bien_the == ma_bien_the_moi:
                raise serializers.ValidationError(
                    {"ma_bien_the_moi": "Biến thể muốn đổi sang phải khác biến thể hiện tại."}
                )
        return attrs


class YeuCauHauMaiUpdateSerializer(serializers.ModelSerializer):
    ma_bien_the = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    ma_bien_the_moi = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    loai_yeu_cau = serializers.ChoiceField(choices=["EXCHANGE", "RETURN", "SUPPORT"])
    ly_do = serializers.CharField()

    class Meta:
        model = YeuCauHauMai
        fields = ["ma_bien_the", "ma_bien_the_moi", "loai_yeu_cau", "ly_do"]

    def validate_ly_do(self, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Lý do không được để trống.")
        return stripped

    def validate(self, attrs):
        instance = self.instance
        loai = attrs.get("loai_yeu_cau", instance.loai_yeu_cau if instance else None)
        ma_bien_the = attrs.get("ma_bien_the", instance.ma_bien_the if instance else None)
        has_new_variant_in_payload = "ma_bien_the_moi" in attrs
        ma_bien_the_moi = attrs.get("ma_bien_the_moi", instance.ma_bien_the_moi if instance else None)

        if loai != "EXCHANGE":
            if has_new_variant_in_payload and attrs["ma_bien_the_moi"] is not None:
                raise serializers.ValidationError(
                    {"ma_bien_the_moi": "Trường ma_bien_the_moi chỉ được sử dụng cho yêu cầu loại EXCHANGE."}
                )
            # Khi đổi từ EXCHANGE sang RETURN/SUPPORT mà không truyền ma_bien_the_moi -> tự động xóa giá trị cũ
            attrs["ma_bien_the_moi"] = None
            ma_bien_the_moi = None

        if loai == "EXCHANGE" and ma_bien_the is not None and ma_bien_the_moi is not None:
            if ma_bien_the == ma_bien_the_moi:
                raise serializers.ValidationError(
                    {"ma_bien_the_moi": "Biến thể muốn đổi sang phải khác biến thể hiện tại."}
                )
        return attrs


class YeuCauHauMaiProcessSerializer(serializers.ModelSerializer):
    trang_thai = serializers.ChoiceField(
        choices=["APPROVED", "REJECTED", "COMPLETED"],
        help_text="Trạng thái xử lý mới: APPROVED / REJECTED / COMPLETED",
    )
    phan_hoi_nhan_vien = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Phản hồi từ Admin khi xử lý yêu cầu",
    )

    class Meta:
        model = YeuCauHauMai
        fields = ["trang_thai", "phan_hoi_nhan_vien"]

    def validate_phan_hoi_nhan_vien(self, value):
        if value is None:
            return None
        stripped = value.strip()
        return stripped if stripped else None

    def validate_trang_thai(self, new_status: str) -> str:
        instance = self.instance
        if instance is not None:
            allowed = VALID_REQUEST_TRANSITIONS.get(instance.trang_thai, set())
            if new_status not in allowed:
                raise serializers.ValidationError(
                    f"Không thể chuyển trạng thái từ '{instance.trang_thai}' sang '{new_status}'."
                )
        return new_status
