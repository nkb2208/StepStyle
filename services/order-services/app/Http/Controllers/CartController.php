<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Cart;
use App\Models\CartItem;

class CartController extends Controller
{
    //Thêm sản phẩm vào giỏ hàng
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

    // Lấy giỏ hàng
    public function getCart($userID){
        $cart = Cart::with('items')->where('ma_nguoi_dung', $userID)->first();

        if(!$cart){
            return response()->json([
                'status' => 'success',
                'message' => 'Gio hang trong',
                'data' => null
            ], 200);
        }


        return response()->json([
            'status' => 'success',
            'data' => $cart
        ],200);
    }

    // Cập nhật số lượng sản phẩm trong giỏ hàng
public function updateQuantity(Request $request)
    {
        $request->validate([
            'ma_nguoi_dung' => 'required|integer',
            'ma_bien_the'   => 'required|integer',
            'so_luong'      => 'required|integer|min:1'
        ]);

        // 1. Tìm giỏ hàng theo ma_nguoi_dung
        $cart = Cart::where('ma_nguoi_dung', $request->ma_nguoi_dung)->first();
        if (!$cart) {
            return response()->json([
                'message' => 'Khong tim thay gio hang'
            ], 404);
        }

        // 2. Kiểm tra sản phẩm có tồn tại trong giỏ hàng này không
        $exists = CartItem::where('ma_gio_hang', $cart->ma_gio_hang)
                          ->where('ma_bien_the', $request->ma_bien_the)
                          ->exists();

        if (!$exists) {
            return response()->json([
                'message' => 'San pham khong co trong gio hang'
            ], 404);
        }

        // 3. Thực hiện cập nhật trực tiếp xuống Database
        CartItem::where('ma_gio_hang', $cart->ma_gio_hang)
                ->where('ma_bien_the', $request->ma_bien_the)
                ->update(['so_luong' => $request->so_luong]);

        $cart->update(['ngay_cap_nhat' => now()]);

        return response()->json([
            'message' => 'Da cap nhat so luong san pham trong gio hang',
            'so_luong_moi' => $request->so_luong
        ], 200);
    }

    public function deleteItem(Request $request){
        $request->validate([
            'ma_nguoi_dung'=> 'required|integer',
            'ma_bien_the'=> 'required|integer'
        ]);

        $cart = Cart::where('ma_nguoi_dung', $request->ma_nguoi_dung)->first();
        if(!$cart){
            return response()->json([
                'message' => 'Khong tim thay gio hang'
            ],404);
        }

        $deleteItem = CartItem::where('ma_gio_hang', $cart->ma_gio_hang)->where('ma_bien_the', $request->ma_bien_the)->delete();
        if($deleteItem){
            $cart->update([
                'ngay_cap_nhat'=>now()
            ]);

            return response()->json([
                'message' => 'Da xoa san pham thanh cong'
            ],200);
        }

        return response()->json([
            'message' => 'San pham khong có trong gio hang'
        ],404);
    }
}
