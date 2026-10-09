<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    //
    protected $table = 'giohang';
    protected $primaryKey = 'ma_gio_hang';
    public $timestamps = false;

    protected $fillable = ['ma_nguoi_dung', 'ngay_cap_nhat'];


    public function items(){
        return $this->hasMany(CartItem::class, 'ma_gio_hang', 'ma_gio_hang');
    }
}
