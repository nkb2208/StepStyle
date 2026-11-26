<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    //
    protected $table = 'thanhtoan';
    protected $primaryKey = 'ma_thanh_toan';
    public $timestamps = false;
    
    protected $fillable = ['ma_phuong_thuc','ma_don_hang', 'so_tien', 'trang_thai_thanh_toan', 'ma_giao_dich_thanh_cong', 'ngay_tao', 'ngay_thanh_toan'];
}
