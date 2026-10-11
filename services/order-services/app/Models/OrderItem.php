<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    //
    protected $table = 'chitietdonhang';
    protected $primaryKey = 'ma_chi_tiet';
    public $timestamps = false;

    protected $fillable = ['ma_chi_tiet','ma_don_hang', 'ma_bien_the', 'ten_san_pham', 'kich_co', 'mau_sac', 'so_luong', 'don_gia'];
}
