<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpParser\Node\Stmt\TryCatch;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\CartItem;

class OrderController extends Controller
{
    //
    public function checkout(Request $request){
        $request->validate([
            'ma_nguoi_dung'=> 'required|integer',
            'ten_nguoi_nhan' => 'required|string|max:255',
            'so_dien_thoai_nhan' => 'required|string|max:20',
            'dia_chi_giao_hang' => 'required|string',
            'ma_phuong_thuc'=> 'required|integer',
            'phi_van_chuyen'=> 'nullable|numeric|min:0',
            'tien_giam_gia'=> 'nullable|numeric|min:0',
            'ma_giam_gia' => 'nullable|integer',
            'ghi_chu' => 'nullable|string',
            'items'=>'required|array|min:1',
            'items.*.ma_bien_the'        => 'required|integer',
            'items.*.ten_san_pham'       => 'required|string|max:255',
            'items.*.kich_co'            => 'required|string|max:20',
            'items.*.mau_sac'            => 'required|string|max:50',
            'items.*.so_luong'           => 'required|integer|min:1',
            'items.*.don_gia'            => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();

        try{
            $total_product_cost = 0;

            foreach($request -> items as $item){
                $total_product_cost+=$item['so_luong'] * $item['don_gia'];
            }

            $ship_cost = $request->phi_van_chuyen ?? 0;
            $sale_cost = $request->tien_giam_gia ?? 0;

            $total_cost = $total_product_cost+ $ship_cost-$sale_cost;

            $order = Order::create([
                'ma_nguoi_dung'       => $request->ma_nguoi_dung,
                'ten_nguoi_nhan'      => $request->ten_nguoi_nhan,
                'so_dien_thoai_nhan'  => $request->so_dien_thoai_nhan,
                'dia_chi_giao_hang'   => $request->dia_chi_giao_hang,
                'tong_tien_hang'      => $total_product_cost,
                'tien_giam_gia'       => $sale_cost,
                'phi_van_chuyen'      => $ship_cost,
                'tong_thanh_toan'     => $total_cost,
                'trang_thai_don_hang' => 'PENDING',
                'ma_giam_gia'         => $request->ma_giam_gia,
                'ghi_chu'             => $request->ghi_chu,
                'ngay_dat'            => now(),
                'ngay_cap_nhat'       => now(),
            ]);

            $variantID = [];
            foreach($request-> items as $item){
                OrderItem::create([
                    'ma_don_hang' => $order->ma_don_hang,
                    'ma_bien_the' => $item['ma_bien_the'],
                    'ten_san_pham'=> $item['ten_san_pham'],
                    'kich_co' => $item['kich_co'],
                    'mau_sac' => $item['mau_sac'],
                    'so_luong'=>$item['so_luong'],
                    'don_gia' => $item['don_gia']
                ]);
                $variantID[] = $item['ma_bien_the'];
            }

            Payment::create([
                'ma_don_hang' => $order->ma_don_hang,
                'ma_phuong_thuc'=>$request->ma_phuong_thuc,
                'so_tien'=> $total_cost,
                'trang_thai_thanh_toan'=>'PENDING',
                'ngay_tao'=> now()
            ]);

            $cart = Cart::where('ma_nguoi_dung', $request->ma_nguoi_dung)->first();
            if($cart){
                CartItem::where('ma_gio_hang', $cart->ma_gio_hang)->whereIn('ma_bien_the', $variantID)->delete();
                $cart->update(['ngay_cap_nhat'=>now()]);
            }

            DB::commit();

            return response()->json([
                'message'=> 'Dat hang thanh cong',
                'data'=> $order->load(['items', 'payment'])
            ],200);

        }catch(\Exception $e){
            DB::rollBack();

            return response()->json([
                'status'=>'error',
                'message'=>'Co loi xay ra',
                'error'=> $e->getMessage()
            ],500);
        }
    }

    public function getOrders($userID){
        $order = Order::with(['items', 'payment'])->where('ma_nguoi_dung', $userID)->orderBy('ngay_dat', 'desc')->get();
        return response()->json([
            'data' => $order
        ],200);
    }

    public function getOrderDetail($orderID){
        $order = Order::with(['items', 'payment'])->find($orderID);
        if(!$order){
            return response()->json([
                'message' => 'Khong tim thay don hang'
            ],404);
        }

        return response()->json([
            'data' => $order
        ], 200);
    }

    public function cancelOrder($orderID){
        $order = Order::find($orderID);

        if (!$order) {
            return response()->json([
                'message' => 'Khong tim thay don hang'
            ], 404);
        }

        if($order->trang_thai_don_hang !== 'PENDING'){
            return response()->json([
                'message'=> 'khong tim thay don hang'
            ],404);
        }

        $order->update([
            'trang_thai_don_hang' => 'CANCELLED',
            'ngay_cap_nhat' => now()
        ]);

        return response()->json([
            'message'=>'Huy don hang thanh cong',
            'data'=> $order
        ],200);
    }


    // Admin
    public function getAllOrders(Request $request)
    {
        $query = Order::with(['items', 'payment'])->orderBy('ngay_dat', 'desc');

        
        if ($request->has('status')) {
            $query->where('trang_thai_don_hang', $request->status);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $query->get()
        ], 200);
    }

    
    public function updateOrderStatus(Request $request, $orderID)
    {
        $request->validate([
            'trang_thai_don_hang' => 'required|in:PENDING,PROCESSING,SHIPPED,DELIVERED,CANCELLED'
        ]);

        $order = Order::with('payment')->find($orderID);
        if (!$order) {
            return response()->json([
                'message' => 'Khong tim thay don hang'
            ], 404);
        }

        $order->update([
            'trang_thai_don_hang' => $request->trang_thai_don_hang,
            'ngay_cap_nhat'       => now()
        ]);

        
        if ($request->trang_thai_don_hang === 'DELIVERED' && $order->payment) {
            $order->payment->update([
                'trang_thai_thanh_toan' => 'SUCCESS',
                'ngay_thanh_toan'       => now()
            ]);
        }

        return response()->json([
            'message' => 'Cap nhat trang thai don hang thanh cong',
            'data'    => $order->fresh(['items', 'payment'])
        ], 200);
    }

    
    public function updatePaymentStatus(Request $request, $orderID)
    {
        $request->validate([
            'trang_thai_thanh_toan'   => 'required|in:PENDING,SUCCESS,FAILED,REFUNDED',
            'ma_giao_dich_thanh_cong' => 'nullable|string|max:100'
        ]);

        $payment = Payment::where('ma_don_hang', $orderID)->first();
        if (!$payment) {
            return response()->json([
                'message' => 'Khong tim thay thong tin thanh toan cua don hang nay'
            ], 404);
        }

        $payment->update([
            'trang_thai_thanh_toan'   => $request->trang_thai_thanh_toan,
            'ma_giao_dich_thanh_cong' => $request->ma_giao_dich_thanh_cong ?? $payment->ma_giao_dich_thanh_cong,
            'ngay_thanh_toan'         => $request->trang_thai_thanh_toan === 'SUCCESS' ? now() : $payment->ngay_thanh_toan
        ]);

        return response()->json([
            'message' => 'Cap nhat thanh toan thanh cong',
            'data'    => $payment
        ], 200);
    }
}
