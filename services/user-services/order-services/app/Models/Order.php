<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    //
    protected $table = 'donhang';

    protected $primaryKey = 'ma_don_hang';

    public $timestamps = false;

    protected $fillable = ['ma_nguoi_dung', 'ten_nguoi_nhan', 'so_dien_thoai_nhan', 'dia_chi_giao_hang', 'tong_tien_hang', 'tien_giam_gia','phi_van_chuyen', 'tong_thanh_toan', 'trang_thai_don_hang', 'ma_giam_gia', 'ghi_chu', 'ngay_dat', 'ngay_cap_nhat'];

    public function items(){
        return $this->hasMany(OrderItem::class, 'ma_don_hang', 'ma_don_hang');
    }

    public function payment(){
        return $this->hasOne(Payment::class, 'ma_don_hang', 'ma_don_hang');
    }
}
