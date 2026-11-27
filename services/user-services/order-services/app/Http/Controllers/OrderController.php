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
use Illuminate\Support\Facades\Http;

class OrderController extends Controller
{
    //
    public function checkout(Request $request){
        $token = $request->bearerToken();
        if(!$token){
            return response()->json([
                'status'=>'error',
                'message'=> 'Bạn cần phải đăng nhập trước khi thanh toán'
            ],401);
        }

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

            $vipPercent = $this->getVipDiscountPercent($request, $request->ma_nguoi_dung);
            $vipDiscountAmount = ($total_product_cost * $vipPercent) / 100;
            $voucherDiscountAmount = $request->tien_giam_gia ?? 0;
            $sale_cost = $vipDiscountAmount+$voucherDiscountAmount;

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


    // Kết nối với service 2
    private function getVipDiscountPercent(Request $request, $userId)
    {
        try {
            $userServiceUrl = env('USER_SERVICE_URL', 'http://127.0.0.1:8002');
            $token = $request->bearerToken(); 

            $response = Http::timeout(3)
                ->withToken($token)
                ->get("{$userServiceUrl}/api/users/{$userId}/vip-benefits");

            if ($response->successful()) {
                return $response->json('discount_percent') ?? 0;
            }
        } catch (\Exception $e) {
            return 0;
        }

        return 0;
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
            ],404);
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

        
        if($request->has('status')) {
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
        if(!$order) {
            return response()->json([
                'message' => 'Khong tim thay don hang'
            ],404);
        }

        $order->update([
            'trang_thai_don_hang' => $request->trang_thai_don_hang,
            'ngay_cap_nhat' => now()
        ]);

        
        if($request->trang_thai_don_hang === 'DELIVERED' && $order->payment) {
            $order->payment->update([
                'trang_thai_thanh_toan' => 'SUCCESS',
                'ngay_thanh_toan'       => now()
            ]);
        }

        return response()->json([
            'message' => 'Cap nhat trang thai don hang thanh cong',
            'data'    => $order->fresh(['items', 'payment'])
        ],200);
    }

    
    public function updatePaymentStatus(Request $request, $orderID)
    {
        $request->validate([
            'trang_thai_thanh_toan'   => 'required|in:PENDING,SUCCESS,FAILED,REFUNDED',
            'ma_giao_dich_thanh_cong' => 'nullable|string|max:100'
        ]);

        $payment = Payment::where('ma_don_hang', $orderID)->first();
        if(!$payment) {
            return response()->json([
                'message' => 'Khong tim thay thong tin thanh toan cua don hang nay'
            ],404);
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

    public function payment_creditcard(){

    }

    public function payment_momo(Request $request, $orderID){
        $order = Order::find($orderID);
        if(!$order){
            return response()->json([
                'message'=>"Khong tim thay don hang"
            ],404);
        }

        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $endpoint = env('MOMO_ENDPOINT') ?: "https://test-payment.momo.vn/v2/gateway/api/create";
        $partnerCode = env('MOMO_PARTNER_CODE') ?: 'MOMOBKUN20180529';
        $accessKey = env('MOMO_ACCESS_KEY') ?: 'klm05TvNBzhg7h7j';
        $secretKey = env('MOMO_SECRET_KEY') ?: 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa';
        $orderInfo = "Thanh toan don hang #" . $order->ma_don_hang;
        $amount = $order->tong_thanh_toan > 0 ? (string)(int)$order->tong_thanh_toan : "10000";
        $momoOrderId = $order->ma_don_hang . "_" . time();
        $redirectUrl = $frontendUrl . "/order";
        $ipnUrl = (env('ORDER_SERVICE_URL') ?: 'http://127.0.0.1:8000') . "/api/orders/{$order->ma_don_hang}/payment";
        $extraData = "";

        $requestId = time() . "";
        $requestType = $request->input('requestType', 'captureWallet'); // default captureWallet, or payWithATM

        try {
            $rawHash = "accessKey=" . $accessKey . "&amount=" . $amount . "&extraData=" . $extraData . "&ipnUrl=" . $ipnUrl . "&orderId=" . $momoOrderId . "&orderInfo=" . $orderInfo . "&partnerCode=" . $partnerCode . "&redirectUrl=" . $redirectUrl . "&requestId=" . $requestId . "&requestType=" . $requestType;
            $signature = hash_hmac("sha256", $rawHash, $secretKey);

            $response = \Illuminate\Support\Facades\Http::timeout(10)->withoutVerifying()->post($endpoint, [
                'partnerCode'=> $partnerCode,
                'partnerName'=> "StepStyle Store",
                'storeId'    => "StepStyle",
                'requestId'  => $requestId,
                'amount'     => (int) $amount,
                'orderId'    => $momoOrderId,
                'orderInfo'  => $orderInfo,
                'redirectUrl'=> $redirectUrl,
                'ipnUrl'     => $ipnUrl,
                'lang'       => 'vi',
                'extraData'  => $extraData,
                'requestType'=> $requestType,
                'signature'  => $signature
            ]);

            $result = $response->json();

            if (isset($result['payUrl'])) {
                return response()->json([
                    'status'=> 'success',
                    'payUrl'=> $result['payUrl']
                ], 200);
            }

            return response()->json([
                'status'  => 'error',
                'message' => $result['message'] ?? 'Cổng MoMo chính thức từ chối kết nối (Mã phản hồi HTTP: ' . $response->status() . '). Vui lòng kiểm tra tài khoản MoMo Business và IP Whitelist.',
                'detail'  => $result ?? $response->body()
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi kết nối đến cổng thanh toán MoMo: ' . $e->getMessage()
            ], 500);
        }
    }

    public function payment_vnpay(Request $request, $orderID){
        $order = Order::find($orderID);
        if (!$order) {
            return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
        }

        date_default_timezone_set('Asia/Ho_Chi_Minh');

        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $vnp_TmnCode = env('VNPAY_TMN_CODE') ?: "H0FXLGFO"; 
        $vnp_HashSecret = env('VNPAY_HASH_SECRET') ?: "IJVDDNUKRJBYDUZUQPYVQCJEIBMTNRRU"; 
        $vnp_Url = env('VNPAY_URL') ?: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"; 
        $vnp_Returnurl = $frontendUrl . "/order"; 

        $amount = $order->tong_thanh_toan > 0 ? (int)$order->tong_thanh_toan : 10000;
        $vnp_TxnRef = $order->ma_don_hang . "_" . time(); 

        $startTime = date("YmdHis");
        $expire = date('YmdHis', strtotime('+15 minutes', strtotime($startTime)));

        $vnp_OrderInfo = "Thanh toan don hang StepStyle " . $order->ma_don_hang;
        $vnp_OrderType = 'billpayment';
        $vnp_Amount = $amount * 100; 
        $vnp_Locale = 'vn';
        $vnp_BankCode = ''; 
        $vnp_IpAddr = $request->ip() ?? '127.0.0.1';

        $inputData = array(
            "vnp_Version" => "2.1.0",
            "vnp_TmnCode" => $vnp_TmnCode,
            "vnp_Amount" => $vnp_Amount,
            "vnp_Command" => "pay",
            "vnp_CreateDate" => $startTime,
            "vnp_CurrCode" => "VND",
            "vnp_IpAddr" => $vnp_IpAddr,
            "vnp_Locale" => $vnp_Locale,
            "vnp_OrderInfo" => $vnp_OrderInfo,
            "vnp_OrderType" => $vnp_OrderType,
            "vnp_ReturnUrl" => $vnp_Returnurl,
            "vnp_TxnRef" => $vnp_TxnRef,
            "vnp_ExpireDate" => $expire
        );

        ksort($inputData);
        $query = "";
        $i = 0;
        $hashdata = "";
        foreach($inputData as $key => $value) {
            if($i == 1) {
                $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
            }else {
                $hashdata .= urlencode($key) . "=" . urlencode($value);
                $i = 1;
            }
            $query .= urlencode($key) . "=" . urlencode($value) . '&';
        }

        $vnp_Url = $vnp_Url . "?" . $query;

        if (isset($vnp_HashSecret)) {
            $vnpSecureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
            $vnp_Url .= 'vnp_SecureHash=' . $vnpSecureHash;
        }

        return response()->json([
            'status' => 'success',
            'payUrl' => $vnp_Url
        ], 200);
    }

    /**
     * Internal API Contract cho After-Sales Service:
     * Xác minh đúng chủ đơn hàng, trạng thái đơn hàng và sản phẩm/biến thể có thuộc đơn hàng hay không.
     *
     * GET /api/internal/orders/{orderId}/verify-purchase
     * Query params:
     *   - ma_nguoi_dung (required|integer|min:1)
     *   - ma_san_pham (nullable|integer|min:1)
     *   - ma_bien_the (nullable|integer|min:1)
     *   - require_delivered (nullable|boolean, default: true)
     */
    public function verifyPurchase(Request $request, $orderID)
    {
        $configuredKey = env('INTERNAL_API_KEY');
        if (!empty($configuredKey) && $request->header('X-Internal-Api-Key') !== $configuredKey) {
            return response()->json([
                'eligible'    => false,
                'reason_code' => 'UNAUTHORIZED_INTERNAL_CALL',
                'message'     => 'Internal API key không hợp lệ.',
                'order'       => null,
            ], 401);
        }

        $validated = $request->validate([
            'ma_nguoi_dung'     => 'required|integer|min:1',
            'ma_san_pham'       => 'nullable|integer|min:1',
            'ma_bien_the'       => 'nullable|integer|min:1',
            'require_delivered' => 'nullable|in:0,1,true,false',
        ]);

        $userId = (int) $validated['ma_nguoi_dung'];
        $productId = isset($validated['ma_san_pham']) ? (int) $validated['ma_san_pham'] : null;
        $variantId = isset($validated['ma_bien_the']) ? (int) $validated['ma_bien_the'] : null;
        $requireDelivered = !isset($validated['require_delivered'])
            ? true
            : in_array(strtolower((string) $validated['require_delivered']), ['1', 'true'], true);

        $order = Order::find($orderID);
        if (!$order) {
            return response()->json([
                'eligible'    => false,
                'reason_code' => 'ORDER_NOT_FOUND',
                'message'     => 'Không tìm thấy đơn hàng.',
                'checks'      => [
                    'order_exists' => false,
                    'is_owner'     => false,
                    'is_delivered' => false,
                    'has_product'  => $productId !== null ? false : null,
                    'has_variant'  => $variantId !== null ? false : null,
                ],
                'order' => null,
            ], 404);
        }

        $itemRows = DB::table('chitietdonhang')
            ->leftJoin('bienthesanpham', 'chitietdonhang.ma_bien_the', '=', 'bienthesanpham.ma_bien_the')
            ->where('chitietdonhang.ma_don_hang', $order->ma_don_hang)
            ->select('chitietdonhang.ma_bien_the', 'bienthesanpham.ma_san_pham')
            ->get();

        $variantIds = $itemRows
            ->pluck('ma_bien_the')
            ->filter(fn ($v) => $v !== null)
            ->map(fn ($v) => (int) $v)
            ->unique()
            ->values()
            ->all();

        $productIds = $itemRows
            ->pluck('ma_san_pham')
            ->filter(fn ($v) => $v !== null)
            ->map(fn ($v) => (int) $v)
            ->unique()
            ->values()
            ->all();

        $isOwner = ((int) $order->ma_nguoi_dung === $userId);
        $isDelivered = ($order->trang_thai_don_hang === 'DELIVERED');
        $hasProduct = $productId !== null ? in_array($productId, $productIds, true) : null;
        $hasVariant = $variantId !== null ? in_array($variantId, $variantIds, true) : null;

        $eligible = true;
        $reasonCode = 'ELIGIBLE';
        $message = 'Xác minh đơn hàng hợp lệ.';

        if (!$isOwner) {
            $eligible = false;
            $reasonCode = 'NOT_ORDER_OWNER';
            $message = 'Bạn không phải chủ sở hữu của đơn hàng này.';
        } elseif ($requireDelivered && !$isDelivered) {
            $eligible = false;
            $reasonCode = 'ORDER_NOT_DELIVERED';
            $message = "Đơn hàng hiện ở trạng thái '{$order->trang_thai_don_hang}', chỉ đơn hàng đã giao (DELIVERED) mới được thực hiện thao tác này.";
        } elseif ($productId !== null && !$hasProduct) {
            $eligible = false;
            $reasonCode = 'PRODUCT_NOT_IN_ORDER';
            $message = 'Sản phẩm này không có trong đơn hàng đã chọn.';
        } elseif ($variantId !== null && !$hasVariant) {
            $eligible = false;
            $reasonCode = 'VARIANT_NOT_IN_ORDER';
            $message = 'Biến thể sản phẩm này không có trong đơn hàng đã chọn.';
        }

        return response()->json([
            'eligible'    => $eligible,
            'reason_code' => $reasonCode,
            'message'     => $message,
            'checks'      => [
                'order_exists' => true,
                'is_owner'     => $isOwner,
                'is_delivered' => $isDelivered,
                'has_product'  => $hasProduct,
                'has_variant'  => $hasVariant,
            ],
            'order' => [
                'ma_don_hang'         => (int) $order->ma_don_hang,
                'ma_nguoi_dung'       => (int) $order->ma_nguoi_dung,
                'trang_thai_don_hang' => $order->trang_thai_don_hang,
                'product_ids'         => $productIds,
                'variant_ids'         => $variantIds,
            ],
        ], 200);
    }
}
