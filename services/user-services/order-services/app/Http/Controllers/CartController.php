<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use App\Services\IamAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CartController extends Controller
{
    public function __construct(private readonly IamAuthService $iamAuth)
    {
    }

    public function addToCart(Request $request)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        $request->validate([
            'ma_nguoi_dung' => 'nullable|integer|min:1',
            'ma_bien_the'   => 'required|integer|min:1',
            'so_luong'      => 'required|integer|min:1',
        ]);

        $targetUserId = $request->filled('ma_nguoi_dung')
            ? (int) $request->input('ma_nguoi_dung')
            : ($auth['user']['ma_nguoi_dung'] ?? null);

        if ($targetUserId === null) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không thể xác định người dùng sở hữu giỏ hàng.',
            ], 403);
        }

        if ($denied = $this->iamAuth->authorizeOwner($auth['user'], $targetUserId)) {
            return $denied;
        }

        $variantID = (int) $request->input('ma_bien_the');
        $quantity = (int) $request->input('so_luong');

        if (Schema::hasTable('bienthesanpham')) {
            $variant = DB::table('bienthesanpham')
                ->where('ma_bien_the', $variantID)
                ->first(['ma_bien_the', 'so_luong_kho']);

            if (!$variant) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Biến thể sản phẩm không tồn tại.',
                ], 404);
            }
        }

        $cart = Cart::firstOrCreate(
            ['ma_nguoi_dung' => $targetUserId],
            ['ngay_cap_nhat' => now()]
        );

        $cartItem = CartItem::where('ma_gio_hang', $cart->ma_gio_hang)
            ->where('ma_bien_the', $variantID)
            ->first();

        $newQuantity = $cartItem ? ((int) $cartItem->so_luong + $quantity) : $quantity;

        if (isset($variant) && $newQuantity > (int) $variant->so_luong_kho) {
            return response()->json([
                'status'  => 'error',
                'message' => "Số lượng vượt quá tồn kho hiện có ({$variant->so_luong_kho}).",
            ], 409);
        }

        if ($cartItem) {
            CartItem::where('ma_gio_hang', $cart->ma_gio_hang)
                ->where('ma_bien_the', $variantID)
                ->update(['so_luong' => $newQuantity]);
        } else {
            CartItem::create([
                'ma_gio_hang' => $cart->ma_gio_hang,
                'ma_bien_the' => $variantID,
                'so_luong'    => $quantity,
                'ngay_them'   => now(),
            ]);
        }

        $cart->update(['ngay_cap_nhat' => now()]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã thêm sản phẩm vào giỏ hàng!',
            'cart_id' => $cart->ma_gio_hang,
        ], 200);
    }

    // Lấy giỏ hàng
    public function getCart(Request $request, $userID)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        if (!is_numeric($userID) || (int) $userID <= 0) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Mã người dùng không hợp lệ.',
            ], 422);
        }

        $targetUserId = (int) $userID;
        if ($denied = $this->iamAuth->authorizeOwner($auth['user'], $targetUserId)) {
            return $denied;
        }

        $cart = Cart::with('items')->where('ma_nguoi_dung', $targetUserId)->first();

        if (!$cart) {
            return response()->json([
                'status'  => 'success',
                'message' => 'Gio hang trong',
                'data'    => null,
            ], 200);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $cart,
        ], 200);
    }

    // Cập nhật số lượng và phân loại sản phẩm trong giỏ hàng
    public function updateQuantity(Request $request)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        $request->validate([
            'ma_nguoi_dung' => 'nullable|integer|min:1',
            'ma_bien_the'   => 'required|integer|min:1',
            'so_luong'      => 'required|integer|min:1',
            'kich_co'       => 'nullable|string|max:20',
            'mau_sac'       => 'nullable|string|max:50',
        ]);

        $targetUserId = $request->filled('ma_nguoi_dung')
            ? (int) $request->input('ma_nguoi_dung')
            : ($auth['user']['ma_nguoi_dung'] ?? null);

        if ($targetUserId === null) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không thể xác định người dùng sở hữu giỏ hàng.',
            ], 403);
        }

        if ($denied = $this->iamAuth->authorizeOwner($auth['user'], $targetUserId)) {
            return $denied;
        }

        $variantID = (int) $request->input('ma_bien_the');
        $newQuantity = (int) $request->input('so_luong');

        if (Schema::hasTable('bienthesanpham')) {
            $variant = DB::table('bienthesanpham')
                ->where('ma_bien_the', $variantID)
                ->first(['ma_bien_the', 'so_luong_kho']);

            if ($variant && $newQuantity > (int) $variant->so_luong_kho) {
                return response()->json([
                    'status'  => 'error',
                    'message' => "Số lượng vượt quá tồn kho hiện có ({$variant->so_luong_kho}).",
                ], 409);
            }
        }

        $cart = Cart::where('ma_nguoi_dung', $targetUserId)->first();
        if (!$cart) {
            return response()->json([
                'message' => 'Khong tim thay gio hang',
            ], 404);
        }

        $exists = CartItem::where('ma_gio_hang', $cart->ma_gio_hang)
            ->where('ma_bien_the', $variantID)
            ->exists();

        if (!$exists) {
            return response()->json([
                'message' => 'San pham khong co trong gio hang',
            ], 404);
        }

        $updateData = ['so_luong' => $newQuantity];
        if ($request->filled('kich_co') && Schema::hasColumn('chitietgiohang', 'kich_co')) {
            $updateData['kich_co'] = $request->kich_co;
        }
        if ($request->filled('mau_sac') && Schema::hasColumn('chitietgiohang', 'mau_sac')) {
            $updateData['mau_sac'] = $request->mau_sac;
        }

        CartItem::where('ma_gio_hang', $cart->ma_gio_hang)
            ->where('ma_bien_the', $variantID)
            ->update($updateData);

        $cart->update(['ngay_cap_nhat' => now()]);

        return response()->json([
            'message'      => 'Da cap nhat san pham trong gio hang',
            'so_luong_moi' => $newQuantity,
            'kich_co'      => $request->kich_co,
            'mau_sac'      => $request->mau_sac,
        ], 200);
    }

    public function deleteItem(Request $request)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        $request->validate([
            'ma_nguoi_dung' => 'nullable|integer|min:1',
            'ma_bien_the'   => 'required|integer|min:1',
        ]);

        $targetUserId = $request->filled('ma_nguoi_dung')
            ? (int) $request->input('ma_nguoi_dung')
            : ($auth['user']['ma_nguoi_dung'] ?? null);

        if ($targetUserId === null) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không thể xác định người dùng sở hữu giỏ hàng.',
            ], 403);
        }

        if ($denied = $this->iamAuth->authorizeOwner($auth['user'], $targetUserId)) {
            return $denied;
        }

        $cart = Cart::where('ma_nguoi_dung', $targetUserId)->first();
        if (!$cart) {
            return response()->json([
                'message' => 'Khong tim thay gio hang',
            ], 404);
        }

        $deleteItem = CartItem::where('ma_gio_hang', $cart->ma_gio_hang)
            ->where('ma_bien_the', (int) $request->input('ma_bien_the'))
            ->delete();

        if ($deleteItem) {
            $cart->update([
                'ngay_cap_nhat' => now(),
            ]);

            return response()->json([
                'message' => 'Da xoa san pham thanh cong',
            ], 200);
        }

        return response()->json([
            'message' => 'San pham khong có trong gio hang',
        ], 404);
    }
}
