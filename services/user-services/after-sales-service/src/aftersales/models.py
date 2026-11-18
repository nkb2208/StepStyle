from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class DanhGia(models.Model):
    """Bảng `danhgia` (đã tạo bằng SQL, Django chỉ đọc/ghi)."""

    ma_danh_gia = models.BigAutoField(primary_key=True)
    ma_nguoi_dung = models.IntegerField()
    ma_san_pham = models.IntegerField()
    ma_don_hang = models.BigIntegerField()
    so_sao = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    noi_dung = models.TextField(null=True, blank=True)
    trang_thai = models.CharField(
        max_length=10,
        default="PENDING",
        choices=[("PENDING", "PENDING"), ("APPROVED", "APPROVED"), ("HIDDEN", "HIDDEN")],
    )
    ngay_tao = models.DateTimeField(auto_now_add=True)
    ngay_cap_nhat = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False  # không để Django tạo/sửa bảng
        db_table = "danhgia"


class YeuCauHauMai(models.Model):
    """Bảng `yeucauhaumai`: yêu cầu đổi size / trả hàng / hỗ trợ."""

    ma_yeu_cau = models.BigAutoField(primary_key=True)
    ma_nguoi_dung = models.IntegerField()
    ma_don_hang = models.BigIntegerField()
    ma_bien_the = models.IntegerField(null=True, blank=True)
    ma_bien_the_moi = models.IntegerField(null=True, blank=True)
    loai_yeu_cau = models.CharField(
        max_length=10,
        choices=[("EXCHANGE", "EXCHANGE"), ("RETURN", "RETURN"), ("SUPPORT", "SUPPORT")],
    )
    ly_do = models.TextField()
    trang_thai = models.CharField(
        max_length=10,
        default="PENDING",
        choices=[
            ("PENDING", "PENDING"),
            ("APPROVED", "APPROVED"),
            ("REJECTED", "REJECTED"),
            ("COMPLETED", "COMPLETED"),
            ("CANCELLED", "CANCELLED"),
        ],
    )
    phan_hoi_nhan_vien = models.TextField(null=True, blank=True)
    ngay_tao = models.DateTimeField(auto_now_add=True)
    ngay_cap_nhat = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "yeucauhaumai"