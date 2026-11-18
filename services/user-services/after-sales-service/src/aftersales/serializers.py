from rest_framework import serializers

from .models import DanhGia, YeuCauHauMai


class DanhGiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DanhGia
        fields = "__all__"

class DanhGiaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DanhGia
        fields = ["ma_san_pham", "ma_don_hang", "so_sao", "noi_dung"]


class DanhGiaUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DanhGia
        fields = ["so_sao", "noi_dung"]


class YeuCauHauMaiSerializer(serializers.ModelSerializer):
    class Meta:
        model = YeuCauHauMai
        fields = "__all__"

class YeuCauHauMaiCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = YeuCauHauMai
        fields = ["ma_nguoi_dung", "ma_don_hang", "loai_yeu_cau", "ly_do"]

class YeuCauHauMaiUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = YeuCauHauMai
        fields = ["loai_yeu_cau", "ly_do"]