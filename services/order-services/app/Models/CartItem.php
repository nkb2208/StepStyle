<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CartItem extends Model
{
    //
    protected $table = 'chitietgiohang';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = ['ma_gio_hang', 'ma_bien_the', 'so_luong', 'ngay_them'];
}
