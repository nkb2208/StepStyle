<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Cart;
use App\Models\CartItem;

class CartController extends Controller
{
    public function addToCart(Request $request){
        $request->validate([
            'ma_nguoi_dung'=>'required|integer',
            'ma_bien_the'=>'required|integer',
            'so_luong'=>'required|integer|min:1'
        ]);

        $userID = $request->ma_nguoi_dung;
        $variantID = $request->ma_bien_the;
        $quantity = $request->so_luong;
        
        $cart = Cart::firstOrCreate(
            ['ma_nguoi_dung'=>$userID],
            ['ngay_cap_nhat'=>now()]
        );

        $cartItem = CartItem::where('ma_gio_hang', $cart->ma_gio_hang)->where('ma_bien_the', $variantID)->first();

        if ($cartItem) {
            CartItem::where('ma_gio_hang', $cart->ma_gio_hang)
                    ->where('ma_bien_the', $variantID)
                    ->update(['so_luong' => $cartItem->so_luong + $quantity]);
        } else {
            CartItem::create([
                'ma_gio_hang' => $cart->ma_gio_hang,
                'ma_bien_the' => $variantID,
                'so_luong' => $quantity,
                'ngay_them' => now()
            ]);
        }

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

    // Cập nhật số lượng và phân loại (size, màu sắc) sản phẩm trong giỏ hàng
    public function updateQuantity(Request $request)
    {
        $request->validate([
            'ma_nguoi_dung' => 'required|integer',
            'ma_bien_the'   => 'required|integer',
            'so_luong'      => 'required|integer|min:1',
            'kich_co'       => 'nullable|string|max:20',
            'mau_sac'       => 'nullable|string|max:50'
        ]);

        $cart = Cart::where('ma_nguoi_dung', $request->ma_nguoi_dung)->first();
        if (!$cart) {
            return response()->json([
                'message' => 'Khong tim thay gio hang'
            ], 404);
        }

        $exists = CartItem::where('ma_gio_hang', $cart->ma_gio_hang)
                          ->where('ma_bien_the', $request->ma_bien_the)
                          ->exists();

        if (!$exists) {
            return response()->json([
                'message' => 'San pham khong co trong gio hang'
            ], 404);
        }

        $updateData = ['so_luong' => $request->so_luong];
        if ($request->filled('kich_co') && \Illuminate\Support\Facades\Schema::hasColumn('chitietgiohang', 'kich_co')) {
            $updateData['kich_co'] = $request->kich_co;
        }
        if ($request->filled('mau_sac') && \Illuminate\Support\Facades\Schema::hasColumn('chitietgiohang', 'mau_sac')) {
            $updateData['mau_sac'] = $request->mau_sac;
        }

        CartItem::where('ma_gio_hang', $cart->ma_gio_hang)
                ->where('ma_bien_the', $request->ma_bien_the)
                ->update($updateData);

        $cart->update(['ngay_cap_nhat' => now()]);

        return response()->json([
            'message' => 'Da cap nhat san pham trong gio hang',
            'so_luong_moi' => $request->so_luong,
            'kich_co' => $request->kich_co,
            'mau_sac' => $request->mau_sac
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
