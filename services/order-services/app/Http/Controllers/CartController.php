<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Cart;
use App\Models\CartItem;

class CartController extends Controller
{
    //
    public function addToCart(Request $request){
        // 1. Lấy dữ liệu từ front-end
        $request->validate([
            'ma_nguoi_dung'=>'required|integer',
            'ma_bien_the'=>'required|integer',
            'so_luong'=>'required|integer|min:1'
        ]);

        $userID = $request->ma_nguoi_dung;
        $variantID = $request->ma_bien_the;
        $quantity = $request->so_luong;
        
        // 2. Tìm giỏ hàng của người dùng (Nếu không có thì tạo mới)
        $cart = Cart::firstOrCreate(
            ['ma_nguoi_dung'=>$userID],
            ['ngay_cap_nhat'=>now()]
        );

        // 3. Kiểm tra sản phẩm đã có trong giỏ hàng hay chưa.
        $cartItem = CartItem::where('ma_gio_hang', $cart->ma_gio_hang)->where('ma_bien_the', $variantID)->first();

        if ($cartItem) {
            // Đã có -> Cộng dồn số lượng
            $cartItem->so_luong += $quantity;
            $cartItem->save();
        } else {
            // Chưa có -> Thêm mới vào chi tiết giỏ hàng
            CartItem::create([
                'ma_gio_hang' => $cart->ma_gio_hang,
                'ma_bien_the' => $variantID,
                'so_luong' => $quantity,
                'ngay_them' => now()
            ]);
        }

        // Cập nhật lại thời gian của giỏ hàng
        $cart->update(['ngay_cap_nhat' => now()]);

        return response()->json([
            'status' => 'success',
            'message' => 'Đã thêm sản phẩm vào giỏ hàng!',
            'cart_id' => $cart->ma_gio_hang
        ], 200);
    }
}
