<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Services\IamAuthService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class OrderController extends Controller
{
    public function __construct(private readonly IamAuthService $iamAuth)
    {
    }

    public function checkout(Request $request)
    {
        // Kết nối với Service 1 (IAM) theo cơ chế fail-closed
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        $request->validate([
            'ma_nguoi_dung'        => 'nullable|integer|min:1',
            'ten_nguoi_nhan'       => 'required|string|max:255',
            'so_dien_thoai_nhan'   => 'required|string|max:20',
            'dia_chi_giao_hang'    => 'required|string',
            'ma_phuong_thuc'       => 'required|integer|min:1',
            'phi_van_chuyen'       => 'nullable|numeric|min:0',
            'tien_giam_gia'        => 'nullable|numeric|min:0',
            'ma_giam_gia'          => 'nullable|integer|min:1',
            'code_giam_gia'        => 'nullable|string|max:50',
            'voucher_code'         => 'nullable|string|max:50',
            'ghi_chu'              => 'nullable|string',
            'items'                => 'required|array|min:1',
            'items.*.ma_bien_the'  => 'required|integer|min:1',
            'items.*.ten_san_pham' => 'nullable|string|max:255',
            'items.*.kich_co'      => 'nullable|string|max:20',
            'items.*.mau_sac'      => 'nullable|string|max:50',
            'items.*.so_luong'     => 'required|integer|min:1',
            'items.*.don_gia'      => 'nullable|numeric|min:0',
        ]);

        // Xác định & kiểm tra quyền sở hữu ma_nguoi_dung
        $ownerUserId = $request->filled('ma_nguoi_dung')
            ? (int) $request->input('ma_nguoi_dung')
            : ($auth['user']['ma_nguoi_dung'] ?? null);

        if ($ownerUserId === null) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không thể xác định người dùng đặt hàng cho phiên đăng nhập này.',
            ], 403);
        }

        if ($denied = $this->iamAuth->authorizeOwner($auth['user'], $ownerUserId)) {
            return $denied;
        }

        $paymentMethodId = (int) $request->input('ma_phuong_thuc');
        if (Schema::hasTable('phuongthucthanhtoan')) {
            $method = DB::table('phuongthucthanhtoan')
                ->where('ma_phuong_thuc', $paymentMethodId)
                ->first(['ma_phuong_thuc', 'kich_hoat']);

            if (!$method || !(bool) $method->kich_hoat) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Phương thức thanh toán không hợp lệ hoặc đã tạm ngưng.',
                ], 422);
            }
        }

        // Gộp các item trùng ma_bien_the và sắp xếp tăng dần để tránh deadlock khi khóa dòng tồn kho
        $requestedQuantities = [];
        foreach ($request->input('items', []) as $item) {
            $variantId = (int) $item['ma_bien_the'];
            $qty = (int) $item['so_luong'];
            $requestedQuantities[$variantId] = ($requestedQuantities[$variantId] ?? 0) + $qty;
        }
        ksort($requestedQuantities);

        // Lấy quyền lợi VIP từ Service 2 (User & Loyalty) trước khi mở transaction DB
        $vipBenefits = $this->getVipBenefits($request, $ownerUserId);

        DB::beginTransaction();

        try {
            $totalProductCost = 0;
            $resolvedItems = [];
            $variantIds = [];

            foreach ($requestedQuantities as $variantId => $qty) {
                $variant = DB::table('bienthesanpham')
                    ->join('sanpham', 'bienthesanpham.ma_san_pham', '=', 'sanpham.ma_san_pham')
                    ->where('bienthesanpham.ma_bien_the', $variantId)
                    ->select(
                        'bienthesanpham.ma_bien_the',
                        'bienthesanpham.ma_san_pham',
                        'bienthesanpham.kich_co',
                        'bienthesanpham.mau_sac',
                        'bienthesanpham.so_luong_kho',
                        'sanpham.ten_san_pham',
                        'sanpham.gia_goc',
                        'sanpham.gia_khuyen_mai',
                        'sanpham.trang_thai'
                    )
                    ->lockForUpdate()
                    ->first();

                if (!$variant) {
                    DB::rollBack();
                    return response()->json([
                        'status'  => 'error',
                        'message' => "Biến thể sản phẩm #{$variantId} không tồn tại.",
                    ], 422);
                }

                if (strtoupper((string) $variant->trang_thai) !== 'ACTIVE') {
                    DB::rollBack();
                    return response()->json([
                        'status'  => 'error',
                        'message' => "Sản phẩm '{$variant->ten_san_pham}' hiện đã ngừng kinh doanh.",
                    ], 422);
                }

                // Đơn giá luôn tính từ DB (bỏ qua mọi giá trị don_gia gửi từ Frontend)
                $basePrice = (int) round((float) $variant->gia_goc);
                $promoPrice = $variant->gia_khuyen_mai !== null
                    ? (int) round((float) $variant->gia_khuyen_mai)
                    : null;
                $unitPrice = ($promoPrice !== null && $promoPrice > 0 && $promoPrice < $basePrice)
                    ? $promoPrice
                    : $basePrice;

                // Trừ tồn kho có điều kiện nguyên tử VÀ kiểm tra chặt số dòng bị ảnh hưởng
                $affected = DB::table('bienthesanpham')
                    ->where('ma_bien_the', $variantId)
                    ->where('so_luong_kho', '>=', $qty)
                    ->decrement('so_luong_kho', $qty);

                if ($affected !== 1) {
                    DB::rollBack();
                    return response()->json([
                        'status'  => 'error',
                        'message' => "Sản phẩm '{$variant->ten_san_pham}' (size {$variant->kich_co}, màu {$variant->mau_sac}) không đủ tồn kho (còn {$variant->so_luong_kho}, yêu cầu {$qty}).",
                    ], 409);
                }

                $totalProductCost += $qty * $unitPrice;
                $variantIds[] = $variantId;
                $resolvedItems[] = [
                    'ma_bien_the'  => $variantId,
                    'ma_san_pham'  => (int) $variant->ma_san_pham,
                    'ten_san_pham' => (string) $variant->ten_san_pham,
                    'kich_co'      => (string) $variant->kich_co,
                    'mau_sac'      => (string) $variant->mau_sac,
                    'so_luong'     => $qty,
                    'don_gia'      => $unitPrice,
                ];
            }

            // Phí vận chuyển luôn tính từ cấu hình cửa hàng (caidatcuahang) + quyền lợi VIP, bỏ qua phi_van_chuyen từ Frontend
            $shipCost = $this->calculateShippingFee($totalProductCost, $vipBenefits);

            // Tiền giảm giá VIP tính từ Service 2
            $vipPercent = max(0.0, min(100.0, (float) ($vipBenefits['discount_percent'] ?? 0)));
            $vipDiscountAmount = (int) round(($totalProductCost * $vipPercent) / 100);

            // Tiền giảm giá Voucher luôn tính từ bảng magiamgia, bỏ qua tien_giam_gia từ Frontend
            $voucherResult = $this->applyVoucherFromDatabase($request, $totalProductCost);
            if (!$voucherResult['ok']) {
                DB::rollBack();
                return response()->json([
                    'status'  => 'error',
                    'message' => $voucherResult['message'],
                ], $voucherResult['status']);
            }

            $appliedVoucherId = $voucherResult['ma_giam_gia'];
            $voucherDiscountAmount = $voucherResult['discount'];

            // Đảm bảo tien_giam_gia không vượt quá tong_tien_hang và thỏa ràng buộc chk_dh_tong:
            // tong_thanh_toan = tong_tien_hang - tien_giam_gia + phi_van_chuyen
            $saleCost = min($totalProductCost, max(0, $vipDiscountAmount + $voucherDiscountAmount));
            $totalCost = $totalProductCost - $saleCost + $shipCost;

            $order = Order::create([
                'ma_nguoi_dung'       => $ownerUserId,
                'ten_nguoi_nhan'      => $request->ten_nguoi_nhan,
                'so_dien_thoai_nhan'  => $request->so_dien_thoai_nhan,
                'dia_chi_giao_hang'   => $request->dia_chi_giao_hang,
                'tong_tien_hang'      => $totalProductCost,
                'tien_giam_gia'       => $saleCost,
                'phi_van_chuyen'      => $shipCost,
                'tong_thanh_toan'     => $totalCost,
                'trang_thai_don_hang' => 'PENDING',
                'ma_giam_gia'         => $appliedVoucherId,
                'ghi_chu'             => $request->ghi_chu,
                'ngay_dat'            => now(),
                'ngay_cap_nhat'       => now(),
            ]);

            foreach ($resolvedItems as $item) {
                OrderItem::create([
                    'ma_don_hang'  => $order->ma_don_hang,
                    'ma_bien_the'  => $item['ma_bien_the'],
                    'ten_san_pham' => $item['ten_san_pham'],
                    'kich_co'      => $item['kich_co'],
                    'mau_sac'      => $item['mau_sac'],
                    'so_luong'     => $item['so_luong'],
                    'don_gia'      => $item['don_gia'],
                ]);
            }

            Payment::create([
                'ma_don_hang'           => $order->ma_don_hang,
                'ma_phuong_thuc'        => $paymentMethodId,
                'so_tien'               => $totalCost,
                'trang_thai_thanh_toan' => 'PENDING',
                'ngay_tao'              => now(),
            ]);

            $cart = Cart::where('ma_nguoi_dung', $ownerUserId)->first();
            if ($cart) {
                CartItem::where('ma_gio_hang', $cart->ma_gio_hang)
                    ->whereIn('ma_bien_the', $variantIds)
                    ->delete();
                $cart->update(['ngay_cap_nhat' => now()]);
            }

            DB::commit();

            // Kết nối với Service 3 (Catalog & Search) sau khi commit thành công
            $this->syncCatalogAfterCheckout($order->ma_don_hang, $resolvedItems);

            return response()->json([
                'message' => 'Dat hang thanh cong',
                'data'    => $order->load(['items', 'payment']),
            ], 200);
        } catch (\Throwable $e) {
            DB::rollBack();

            Log::error('Checkout failed', [
                'user_id' => $ownerUserId,
                'error'   => $e->getMessage(),
            ]);

            return response()->json([
                'status'  => 'error',
                'message' => 'Co loi xay ra trong qua trinh dat hang',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    private function calculateShippingFee(int $totalProductCost, array $vipBenefits): int
    {
        if (!empty($vipBenefits['free_shipping'])) {
            return 0;
        }

        $baseShippingFee = 35000;
        $freeShippingThreshold = 500000;

        if (Schema::hasTable('caidatcuahang')) {
            $storeConfig = DB::table('caidatcuahang')
                ->first(['phi_van_chuyen_co_ban', 'nguong_mien_phi_van_chuyen']);

            if ($storeConfig) {
                $baseShippingFee = max(0, (int) round((float) $storeConfig->phi_van_chuyen_co_ban));
                $freeShippingThreshold = max(0, (int) round((float) $storeConfig->nguong_mien_phi_van_chuyen));
            }
        }

        if ($freeShippingThreshold > 0 && $totalProductCost >= $freeShippingThreshold) {
            return 0;
        }

        return $baseShippingFee;
    }

    private function applyVoucherFromDatabase(Request $request, int $totalProductCost): array
    {
        $voucherIdInput = $request->filled('ma_giam_gia') ? (int) $request->input('ma_giam_gia') : null;
        $voucherCodeInput = trim((string) ($request->input('code_giam_gia') ?? $request->input('voucher_code') ?? ''));

        if ($voucherIdInput === null && $voucherCodeInput === '') {
            return ['ok' => true, 'ma_giam_gia' => null, 'discount' => 0];
        }

        if (!Schema::hasTable('magiamgia')) {
            return [
                'ok'      => false,
                'status'  => 422,
                'message' => 'Hệ thống chưa hỗ trợ áp dụng mã giảm giá.',
            ];
        }

        $query = DB::table('magiamgia');
        if ($voucherIdInput !== null) {
            $query->where('ma_giam_gia', $voucherIdInput);
        } else {
            $query->whereRaw('UPPER(code_giam_gia) = ?', [strtoupper($voucherCodeInput)]);
        }

        $voucher = $query->lockForUpdate()->first();
        if (!$voucher) {
            return [
                'ok'      => false,
                'status'  => 422,
                'message' => 'Mã giảm giá không tồn tại.',
            ];
        }

        if (!(bool) $voucher->kich_hoat) {
            return [
                'ok'      => false,
                'status'  => 422,
                'message' => 'Mã giảm giá đã bị vô hiệu hóa.',
            ];
        }

        $now = now();
        if (!empty($voucher->ngay_bat_dau) && $now->lt(Carbon::parse($voucher->ngay_bat_dau))) {
            return [
                'ok'      => false,
                'status'  => 422,
                'message' => 'Mã giảm giá chưa đến thời gian áp dụng.',
            ];
        }

        if (!empty($voucher->ngay_ket_thuc) && $now->gt(Carbon::parse($voucher->ngay_ket_thuc))) {
            return [
                'ok'      => false,
                'status'  => 422,
                'message' => 'Mã giảm giá đã hết hạn sử dụng.',
            ];
        }

        $minOrderAmount = (int) round((float) ($voucher->gia_tri_toi_thieu ?? 0));
        if ($totalProductCost < $minOrderAmount) {
            return [
                'ok'      => false,
                'status'  => 422,
                'message' => "Đơn hàng cần tối thiểu {$minOrderAmount}đ để áp dụng mã giảm giá này.",
            ];
        }

        // Tăng lượt sử dụng nguyên tử và kiểm tra còn lượt
        $voucherUpdated = DB::table('magiamgia')
            ->where('ma_giam_gia', $voucher->ma_giam_gia)
            ->whereColumn('so_luong_da_dung', '<', 'so_luong')
            ->increment('so_luong_da_dung', 1);

        if ($voucherUpdated !== 1) {
            return [
                'ok'      => false,
                'status'  => 409,
                'message' => 'Mã giảm giá đã hết lượt sử dụng.',
            ];
        }

        $type = strtoupper((string) ($voucher->loai_giam_gia ?? 'FIXED_AMOUNT'));
        $rawValue = (float) ($voucher->gia_tri_giam ?? 0);

        if ($type === 'PERCENT') {
            $discount = (int) round(($totalProductCost * max(0.0, min(100.0, $rawValue))) / 100);
            if ($voucher->gia_tri_giam_toi_da !== null && (float) $voucher->gia_tri_giam_toi_da > 0) {
                $discount = min($discount, (int) round((float) $voucher->gia_tri_giam_toi_da));
            }
        } else {
            $discount = max(0, (int) round($rawValue));
        }

        return [
            'ok'          => true,
            'ma_giam_gia' => (int) $voucher->ma_giam_gia,
            'discount'    => min($totalProductCost, $discount),
        ];
    }

    // Kết nối với Service 2 (User & Loyalty)
    private function getVipBenefits(Request $request, $userId): array
    {
        try {
            $userServiceUrl = rtrim((string) env('USER_SERVICE_URL', 'http://127.0.0.1:8002'), '/');
            $token = $request->bearerToken();

            $response = Http::timeout(3)
                ->withToken($token)
                ->get("{$userServiceUrl}/api/users/{$userId}/vip-benefits");

            if ($response->successful()) {
                return [
                    'discount_percent' => (float) ($response->json('discount_percent') ?? 0),
                    'free_shipping'    => (bool) ($response->json('free_shipping') ?? false),
                    'tier'             => $response->json('tier') ?? 'STANDARD',
                ];
            }
        } catch (\Throwable $e) {
            return ['discount_percent' => 0, 'free_shipping' => false, 'tier' => 'STANDARD'];
        }

        return ['discount_percent' => 0, 'free_shipping' => false, 'tier' => 'STANDARD'];
    }

    // Kết nối với Service 3 (Catalog & Search) sau khi đặt hàng
    private function syncCatalogAfterCheckout($orderId, array $items): void
    {
        $catalogUrl = rtrim((string) env('CATALOG_SERVICE_URL', ''), '/');
        if ($catalogUrl === '') {
            return;
        }

        foreach ($items as $item) {
            $variantId = (int) $item['ma_bien_the'];
            $qty = (int) $item['so_luong'];
            $productId = isset($item['ma_san_pham']) ? (int) $item['ma_san_pham'] : null;

            try {
                Http::timeout(2)->post("{$catalogUrl}/api/v1/internal/inventory/adjust", [
                    'transactionId' => "ORDER-{$orderId}-DEDUCT-V{$variantId}",
                    'variantId'     => $variantId,
                    'quantity'      => $qty,
                    'action'        => 'DEDUCT',
                ]);

                if (!$productId) {
                    $productId = DB::table('bienthesanpham')
                        ->where('ma_bien_the', $variantId)
                        ->value('ma_san_pham');
                }

                if ($productId) {
                    Http::timeout(2)->post("{$catalogUrl}/api/v1/internal/products/{$productId}/metrics", [
                        'soldCountDelta' => $qty,
                    ]);
                }
            } catch (\Throwable $e) {
                // Best-effort sync to Catalog Service
            }
        }
    }

    // Đồng bộ best-effort sang Service 3 (Catalog & Search) sau khi tồn kho DB đã được hoàn nguyên tử
    private function notifyCatalogReleaseInventory(Order $order): void
    {
        $catalogUrl = rtrim((string) env('CATALOG_SERVICE_URL', ''), '/');
        if ($catalogUrl === '') {
            return;
        }

        foreach ($order->items as $item) {
            $variantId = (int) $item->ma_bien_the;
            $qty = (int) $item->so_luong;

            try {
                Http::timeout(2)->post("{$catalogUrl}/api/v1/internal/inventory/adjust", [
                    'transactionId' => "ORDER-{$order->ma_don_hang}-RELEASE-V{$variantId}",
                    'variantId'     => $variantId,
                    'quantity'      => $qty,
                    'action'        => 'RELEASE',
                ]);
            } catch (\Throwable $e) {
                // Best-effort sync to Catalog Service
            }
        }
    }

    public function getMyOrders(Request $request)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        $targetUserId = $auth['user']['ma_nguoi_dung'] ?? null;
        if ($targetUserId === null) {
            return response()->json([
                'data' => [],
            ], 200);
        }

        $orders = Order::with(['items', 'payment'])
            ->where('ma_nguoi_dung', (int) $targetUserId)
            ->orderBy('ngay_dat', 'desc')
            ->get();

        return response()->json([
            'data' => $orders,
        ], 200);
    }

    public function getOrders(Request $request, $userID)
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

        $orders = Order::with(['items', 'payment'])
            ->where('ma_nguoi_dung', $targetUserId)
            ->orderBy('ngay_dat', 'desc')
            ->get();

        return response()->json([
            'data' => $orders,
        ], 200);
    }

    public function getOrderDetail(Request $request, $orderID)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        $order = Order::with(['items', 'payment'])->find($orderID);
        if (!$order) {
            return response()->json([
                'message' => 'Khong tim thay don hang',
            ], 404);
        }

        if ($denied = $this->iamAuth->authorizeOwner($auth['user'], (int) $order->ma_nguoi_dung)) {
            return $denied;
        }

        return response()->json([
            'data' => $order,
        ], 200);
    }

    /**
     * Endpoint để Frontend truy vấn trạng thái thanh toán xác thực từ Backend sau khi cổng thanh toán redirect về.
     */
    public function getPaymentStatus(Request $request, $orderID)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        $order = Order::with('payment')->find($orderID);
        if (!$order) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy đơn hàng.',
            ], 404);
        }

        if ($denied = $this->iamAuth->authorizeOwner($auth['user'], (int) $order->ma_nguoi_dung)) {
            return $denied;
        }

        $payment = $order->payment;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'ma_don_hang'           => (int) $order->ma_don_hang,
                'trang_thai_don_hang'   => $order->trang_thai_don_hang,
                'tong_thanh_toan'       => (int) round((float) $order->tong_thanh_toan),
                'trang_thai_thanh_toan' => $payment?->trang_thai_thanh_toan ?? 'PENDING',
                'ma_giao_dich'          => $this->readPaymentTransactionId($payment),
                'ngay_thanh_toan'       => $payment?->ngay_thanh_toan,
                'payment'               => $payment,
            ],
        ], 200);
    }

    public function cancelOrder(Request $request, $orderID)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        $cancelledOrder = null;

        DB::beginTransaction();

        try {
            // Khóa dòng đơn hàng để đảm bảo tính nguyên tử và chống hủy lặp khi có request đồng thời
            $order = Order::with('items')
                ->where('ma_don_hang', $orderID)
                ->lockForUpdate()
                ->first();

            if (!$order) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Khong tim thay don hang',
                ], 404);
            }

            if ($denied = $this->iamAuth->authorizeOwner($auth['user'], (int) $order->ma_nguoi_dung)) {
                DB::rollBack();
                return $denied;
            }

            // Chuyển trạng thái nguyên tử có điều kiện: chỉ chuyển từ PENDING -> CANCELLED đúng 1 lần
            $updated = DB::table('donhang')
                ->where('ma_don_hang', $order->ma_don_hang)
                ->where('trang_thai_don_hang', 'PENDING')
                ->update([
                    'trang_thai_don_hang' => 'CANCELLED',
                    'ngay_cap_nhat'       => now(),
                ]);

            if ($updated !== 1) {
                DB::rollBack();
                $message = $order->trang_thai_don_hang === 'CANCELLED'
                    ? 'Đơn hàng đã được hủy trước đó.'
                    : "Không thể hủy đơn hàng ở trạng thái '{$order->trang_thai_don_hang}'. Chỉ đơn hàng PENDING mới có thể hủy.";

                return response()->json([
                    'status'  => 'error',
                    'message' => $message,
                ], 409);
            }

            // Hoàn tồn kho trong cùng transaction DB (sắp xếp theo ma_bien_the để tránh deadlock)
            $sortedItems = $order->items->sortBy('ma_bien_the');
            foreach ($sortedItems as $item) {
                DB::table('bienthesanpham')
                    ->where('ma_bien_the', (int) $item->ma_bien_the)
                    ->increment('so_luong_kho', (int) $item->so_luong);
            }

            // Hoàn lượt sử dụng voucher nếu đơn hàng có áp mã giảm giá
            if (!empty($order->ma_giam_gia) && Schema::hasTable('magiamgia')) {
                DB::table('magiamgia')
                    ->where('ma_giam_gia', (int) $order->ma_giam_gia)
                    ->where('so_luong_da_dung', '>', 0)
                    ->decrement('so_luong_da_dung', 1);
            }

            DB::commit();

            $cancelledOrder = $order->fresh(['items', 'payment']);
        } catch (\Throwable $e) {
            DB::rollBack();

            Log::error('Cancel order failed', [
                'order_id' => $orderID,
                'error'    => $e->getMessage(),
            ]);

            return response()->json([
                'status'  => 'error',
                'message' => 'Có lỗi xảy ra khi hủy đơn hàng.',
            ], 500);
        }

        // Đồng bộ best-effort sang Service 3 (Catalog) sau khi transaction DB đã commit
        $this->notifyCatalogReleaseInventory($cancelledOrder);

        return response()->json([
            'message' => 'Huy don hang thanh cong',
            'data'    => $cancelledOrder,
        ], 200);
    }

    // Admin
    public function getAllOrders(Request $request)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        if ($denied = $this->iamAuth->authorizeStaff($auth['user'])) {
            return $denied;
        }

        $query = Order::with(['items', 'payment'])->orderBy('ngay_dat', 'desc');

        if ($request->filled('status')) {
            $query->where('trang_thai_don_hang', $request->input('status'));
        }

        return response()->json([
            'status' => 'success',
            'data'   => $query->get(),
        ], 200);
    }

    public function updateOrderStatus(Request $request, $orderID)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        if ($denied = $this->iamAuth->authorizeStaff($auth['user'])) {
            return $denied;
        }

        $request->validate([
            'trang_thai_don_hang' => 'required|in:PENDING,PROCESSING,SHIPPED,DELIVERED,CANCELLED',
        ]);

        $newStatus = (string) $request->input('trang_thai_don_hang');
        $shouldReleaseCatalog = false;
        $updatedOrder = null;

        DB::beginTransaction();

        try {
            $order = Order::with(['items', 'payment'])
                ->where('ma_don_hang', $orderID)
                ->lockForUpdate()
                ->first();

            if (!$order) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Khong tim thay don hang',
                ], 404);
            }

            $previousStatus = (string) $order->trang_thai_don_hang;

            if ($previousStatus === 'CANCELLED' && $newStatus !== 'CANCELLED') {
                DB::rollBack();
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Không thể thay đổi trạng thái của đơn hàng đã hủy.',
                ], 409);
            }

            if ($newStatus === 'CANCELLED') {
                $affected = DB::table('donhang')
                    ->where('ma_don_hang', $order->ma_don_hang)
                    ->where('trang_thai_don_hang', '!=', 'CANCELLED')
                    ->update([
                        'trang_thai_don_hang' => 'CANCELLED',
                        'ngay_cap_nhat'       => now(),
                    ]);

                if ($affected === 1) {
                    foreach ($order->items->sortBy('ma_bien_the') as $item) {
                        DB::table('bienthesanpham')
                            ->where('ma_bien_the', (int) $item->ma_bien_the)
                            ->increment('so_luong_kho', (int) $item->so_luong);
                    }

                    if (!empty($order->ma_giam_gia) && Schema::hasTable('magiamgia')) {
                        DB::table('magiamgia')
                            ->where('ma_giam_gia', (int) $order->ma_giam_gia)
                            ->where('so_luong_da_dung', '>', 0)
                            ->decrement('so_luong_da_dung', 1);
                    }

                    $shouldReleaseCatalog = true;
                }
            } else {
                $order->update([
                    'trang_thai_don_hang' => $newStatus,
                    'ngay_cap_nhat'       => now(),
                ]);

                if ($newStatus === 'DELIVERED' && $order->payment && $order->payment->trang_thai_thanh_toan !== 'SUCCESS') {
                    $order->payment->update([
                        'trang_thai_thanh_toan' => 'SUCCESS',
                        'ngay_thanh_toan'       => now(),
                    ]);
                }
            }

            DB::commit();

            $updatedOrder = $order->fresh(['items', 'payment']);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'status'  => 'error',
                'message' => 'Không thể cập nhật trạng thái đơn hàng.',
            ], 500);
        }

        if ($shouldReleaseCatalog && $updatedOrder) {
            $this->notifyCatalogReleaseInventory($updatedOrder);
        }

        return response()->json([
            'message' => 'Cap nhat trang thai don hang thanh cong',
            'data'    => $updatedOrder,
        ], 200);
    }

    public function updatePaymentStatus(Request $request, $orderID)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        if ($denied = $this->iamAuth->authorizeStaff($auth['user'])) {
            return $denied;
        }

        $request->validate([
            'trang_thai_thanh_toan'   => 'required|in:PENDING,SUCCESS,FAILED,REFUNDED',
            'ma_giao_dich_thanh_cong' => 'nullable|string|max:100',
            'ma_giao_dich_cong'       => 'nullable|string|max:100',
        ]);

        $payment = Payment::where('ma_don_hang', $orderID)->first();
        if (!$payment) {
            return response()->json([
                'message' => 'Khong tim thay thong tin thanh toan cua don hang nay',
            ], 404);
        }

        $transactionId = $request->input('ma_giao_dich_cong')
            ?? $request->input('ma_giao_dich_thanh_cong')
            ?? $this->readPaymentTransactionId($payment);

        $updatePayload = [
            'trang_thai_thanh_toan' => $request->input('trang_thai_thanh_toan'),
            'ngay_thanh_toan'       => $request->input('trang_thai_thanh_toan') === 'SUCCESS'
                ? now()
                : $payment->ngay_thanh_toan,
        ];

        $this->assignPaymentTransactionColumns($updatePayload, $transactionId);
        $payment->update($updatePayload);

        return response()->json([
            'message' => 'Cap nhat thanh toan thanh cong',
            'data'    => $payment->fresh(),
        ], 200);
    }

    public function payment_creditcard()
    {
        return response()->json([
            'status'  => 'error',
            'message' => 'Phương thức thanh toán thẻ tín dụng chưa được kích hoạt.',
        ], 501);
    }

    public function payment_momo(Request $request, $orderID)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        $order = Order::with('payment')->find($orderID);
        if (!$order) {
            return response()->json([
                'message' => 'Khong tim thay don hang',
            ], 404);
        }

        if ($denied = $this->iamAuth->authorizeOwner($auth['user'], (int) $order->ma_nguoi_dung)) {
            return $denied;
        }

        if ($order->trang_thai_don_hang === 'CANCELLED') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không thể thanh toán cho đơn hàng đã bị hủy.',
            ], 409);
        }

        if ($order->payment && $order->payment->trang_thai_thanh_toan === 'SUCCESS') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Đơn hàng này đã được thanh toán thành công trước đó.',
            ], 409);
        }

        $amountInt = (int) round((float) $order->tong_thanh_toan);
        if ($amountInt <= 0) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Số tiền thanh toán của đơn hàng không hợp lệ.',
            ], 422);
        }

        $orderServiceUrl = rtrim((string) (env('ORDER_SERVICE_URL') ?: 'http://127.0.0.1:8000'), '/');
        $endpoint = env('MOMO_ENDPOINT') ?: 'https://test-payment.momo.vn/v2/gateway/api/create';
        $partnerCode = env('MOMO_PARTNER_CODE') ?: 'MOMOBKUN20180529';
        $accessKey = env('MOMO_ACCESS_KEY') ?: 'klm05TvNBzhg7h7j';
        $secretKey = env('MOMO_SECRET_KEY') ?: 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa';

        $orderInfo = 'Thanh toan don hang #' . $order->ma_don_hang;
        $amount = (string) $amountInt;
        $momoOrderId = $order->ma_don_hang . '_' . time();
        // Cổng MoMo luôn redirect/IPN về Backend để xác minh chữ ký, mã giao dịch & số tiền trước khi cập nhật DB
        $redirectUrl = "{$orderServiceUrl}/api/payments/momo/callback";
        $ipnUrl = "{$orderServiceUrl}/api/payments/momo/ipn";
        $extraData = '';
        $requestId = $momoOrderId;
        $requestType = $request->input('requestType', 'captureWallet');

        try {
            $rawHash = "accessKey={$accessKey}"
                . "&amount={$amount}"
                . "&extraData={$extraData}"
                . "&ipnUrl={$ipnUrl}"
                . "&orderId={$momoOrderId}"
                . "&orderInfo={$orderInfo}"
                . "&partnerCode={$partnerCode}"
                . "&redirectUrl={$redirectUrl}"
                . "&requestId={$requestId}"
                . "&requestType={$requestType}";
            $signature = hash_hmac('sha256', $rawHash, $secretKey);

            $response = Http::timeout(10)->withoutVerifying()->post($endpoint, [
                'partnerCode' => $partnerCode,
                'partnerName' => 'StepStyle Store',
                'storeId'     => 'StepStyle',
                'requestId'   => $requestId,
                'amount'      => $amountInt,
                'orderId'     => $momoOrderId,
                'orderInfo'   => $orderInfo,
                'redirectUrl' => $redirectUrl,
                'ipnUrl'      => $ipnUrl,
                'lang'        => 'vi',
                'extraData'   => $extraData,
                'requestType' => $requestType,
                'signature'   => $signature,
            ]);

            $result = $response->json();

            if (isset($result['payUrl'])) {
                return response()->json([
                    'status' => 'success',
                    'payUrl' => $result['payUrl'],
                ], 200);
            }

            return response()->json([
                'status'  => 'error',
                'message' => $result['message'] ?? 'Cổng MoMo chính thức từ chối kết nối (Mã phản hồi HTTP: ' . $response->status() . '). Vui lòng kiểm tra tài khoản MoMo Business và IP Whitelist.',
                'detail'  => $result ?? $response->body(),
            ], 400);
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi kết nối đến cổng thanh toán MoMo: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Backend tiếp nhận IPN server-to-server từ MoMo.
     * POST /api/payments/momo/ipn
     */
    public function momoIpn(Request $request)
    {
        $verification = $this->processMomoVerification($request->all());

        return response()->json([
            'status'      => $verification['ok'] ? 'success' : 'error',
            'code'        => $verification['code'],
            'resultCode'  => $verification['ok'] ? 0 : 1,
            'message'     => $verification['message'],
            'order_id'    => $verification['order_id'] ?? null,
            'payment'     => $verification['payment_status'] ?? null,
        ], $verification['http']);
    }

    /**
     * Backend tiếp nhận redirect callback từ MoMo, xác minh & cập nhật DB, rồi chuyển hướng về Frontend để truy vấn kết quả.
     * GET /api/payments/momo/callback
     */
    public function momoCallback(Request $request)
    {
        $verification = $this->processMomoVerification($request->query());

        $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $query = http_build_query(array_filter([
            'gateway'       => 'momo',
            'orderId'       => $verification['order_id'] ?? null,
            'paymentStatus' => $verification['redirect_status'],
            'code'          => $verification['code'],
        ], fn ($v) => $v !== null && $v !== ''));

        return redirect()->away("{$frontendUrl}/order?{$query}");
    }

    private function processMomoVerification(array $data): array
    {
        $requiredFields = [
            'partnerCode',
            'orderId',
            'requestId',
            'amount',
            'orderInfo',
            'orderType',
            'transId',
            'resultCode',
            'message',
            'payType',
            'responseTime',
            'signature',
        ];

        foreach ($requiredFields as $field) {
            if (!array_key_exists($field, $data) || $data[$field] === null || $data[$field] === '') {
                return [
                    'ok'              => false,
                    'http'            => 400,
                    'code'            => 'MISSING_PARAMETERS',
                    'redirect_status' => 'invalid',
                    'message'         => "Thiếu tham số bắt buộc từ MoMo: {$field}.",
                ];
            }
        }

        $configuredPartnerCode = env('MOMO_PARTNER_CODE') ?: 'MOMOBKUN20180529';
        $accessKey = env('MOMO_ACCESS_KEY') ?: 'klm05TvNBzhg7h7j';
        $secretKey = env('MOMO_SECRET_KEY') ?: 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa';

        if ((string) $data['partnerCode'] !== (string) $configuredPartnerCode) {
            return [
                'ok'              => false,
                'http'            => 400,
                'code'            => 'INVALID_PARTNER_CODE',
                'redirect_status' => 'invalid',
                'message'         => 'PartnerCode MoMo không khớp.',
            ];
        }

        $extraData = (string) ($data['extraData'] ?? '');
        $rawHash = "accessKey={$accessKey}"
            . "&amount={$data['amount']}"
            . "&extraData={$extraData}"
            . "&message={$data['message']}"
            . "&orderId={$data['orderId']}"
            . "&orderInfo={$data['orderInfo']}"
            . "&orderType={$data['orderType']}"
            . "&partnerCode={$data['partnerCode']}"
            . "&payType={$data['payType']}"
            . "&requestId={$data['requestId']}"
            . "&responseTime={$data['responseTime']}"
            . "&resultCode={$data['resultCode']}"
            . "&transId={$data['transId']}";

        $expectedSignature = hash_hmac('sha256', $rawHash, $secretKey);
        if (!hash_equals($expectedSignature, (string) $data['signature'])) {
            Log::warning('MoMo callback/IPN signature verification failed', [
                'orderId' => $data['orderId'],
            ]);

            return [
                'ok'              => false,
                'http'            => 400,
                'code'            => 'INVALID_SIGNATURE',
                'redirect_status' => 'invalid',
                'message'         => 'Chữ ký xác thực MoMo không hợp lệ.',
            ];
        }

        if (!preg_match('/^(\d+)(?:_\d+)?$/', (string) $data['orderId'], $matches)) {
            return [
                'ok'              => false,
                'http'            => 400,
                'code'            => 'INVALID_ORDER_ID',
                'redirect_status' => 'invalid',
                'message'         => 'Mã đơn hàng MoMo không đúng định dạng.',
            ];
        }

        if (!is_numeric($data['amount'])) {
            return [
                'ok'              => false,
                'http'            => 400,
                'code'            => 'INVALID_AMOUNT',
                'redirect_status' => 'invalid',
                'message'         => 'Số tiền giao dịch MoMo không hợp lệ.',
            ];
        }

        $orderId = (int) $matches[1];
        $paidAmount = (int) $data['amount'];
        $transId = trim((string) $data['transId']);
        $resultCode = (int) $data['resultCode'];

        return DB::transaction(function () use ($orderId, $paidAmount, $transId, $resultCode) {
            $order = Order::where('ma_don_hang', $orderId)->lockForUpdate()->first();
            if (!$order) {
                return [
                    'ok'              => false,
                    'http'            => 404,
                    'code'            => 'ORDER_NOT_FOUND',
                    'order_id'        => $orderId,
                    'redirect_status' => 'failed',
                    'message'         => 'Không tìm thấy đơn hàng.',
                ];
            }

            $payment = Payment::where('ma_don_hang', $order->ma_don_hang)->lockForUpdate()->first();
            if (!$payment) {
                return [
                    'ok'              => false,
                    'http'            => 404,
                    'code'            => 'PAYMENT_NOT_FOUND',
                    'order_id'        => $orderId,
                    'redirect_status' => 'failed',
                    'message'         => 'Không tìm thấy bản ghi thanh toán của đơn hàng.',
                ];
            }

            $expectedAmount = (int) round((float) $order->tong_thanh_toan);
            if ($paidAmount !== $expectedAmount) {
                Log::warning('MoMo amount mismatch', [
                    'order_id'        => $orderId,
                    'expected_amount' => $expectedAmount,
                    'received_amount' => $paidAmount,
                ]);

                return [
                    'ok'              => false,
                    'http'            => 400,
                    'code'            => 'INVALID_AMOUNT',
                    'order_id'        => $orderId,
                    'redirect_status' => 'invalid',
                    'message'         => 'Số tiền thanh toán không khớp với giá trị đơn hàng.',
                ];
            }

            if ($this->isTransactionIdUsedByAnotherOrder($transId, (int) $order->ma_don_hang)) {
                return [
                    'ok'              => false,
                    'http'            => 409,
                    'code'            => 'DUPLICATE_TRANSACTION',
                    'order_id'        => $orderId,
                    'redirect_status' => 'invalid',
                    'message'         => 'Mã giao dịch MoMo đã được sử dụng cho đơn hàng khác.',
                ];
            }

            // Chống xử lý lặp: nếu đã xác nhận SUCCESS thì giữ nguyên trạng thái và phản hồi idempotent
            if ($payment->trang_thai_thanh_toan === 'SUCCESS') {
                return [
                    'ok'              => true,
                    'http'            => 200,
                    'code'            => 'ALREADY_CONFIRMED',
                    'order_id'        => $orderId,
                    'payment_status'  => 'SUCCESS',
                    'redirect_status' => 'success',
                    'message'         => 'Đơn hàng đã được xác nhận thanh toán trước đó.',
                ];
            }

            if ($order->trang_thai_don_hang === 'CANCELLED') {
                return [
                    'ok'              => false,
                    'http'            => 409,
                    'code'            => 'ORDER_CANCELLED',
                    'order_id'        => $orderId,
                    'payment_status'  => $payment->trang_thai_thanh_toan,
                    'redirect_status' => 'failed',
                    'message'         => 'Đơn hàng đã bị hủy, không thể xác nhận thanh toán.',
                ];
            }

            if ($resultCode === 0) {
                $updateData = [
                    'trang_thai_thanh_toan' => 'SUCCESS',
                    'ngay_thanh_toan'       => now(),
                ];
                $this->assignPaymentTransactionColumns($updateData, $transId);
                $payment->update($updateData);

                return [
                    'ok'              => true,
                    'http'            => 200,
                    'code'            => 'PAYMENT_CONFIRMED',
                    'order_id'        => $orderId,
                    'payment_status'  => 'SUCCESS',
                    'redirect_status' => 'success',
                    'message'         => 'Xác nhận thanh toán MoMo thành công.',
                ];
            }

            $updateData = [
                'trang_thai_thanh_toan' => 'FAILED',
            ];
            $this->assignPaymentTransactionColumns($updateData, $transId);
            $payment->update($updateData);

            return [
                'ok'              => true,
                'http'            => 200,
                'code'            => 'PAYMENT_FAILED',
                'order_id'        => $orderId,
                'payment_status'  => 'FAILED',
                'redirect_status' => 'failed',
                'message'         => 'Giao dịch MoMo không thành công.',
            ];
        });
    }

    public function payment_vnpay(Request $request, $orderID)
    {
        $auth = $this->iamAuth->authenticate($request);
        if (!$auth['ok']) {
            return $this->iamAuth->errorResponse($auth);
        }

        $order = Order::with('payment')->find($orderID);
        if (!$order) {
            return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
        }

        if ($denied = $this->iamAuth->authorizeOwner($auth['user'], (int) $order->ma_nguoi_dung)) {
            return $denied;
        }

        if ($order->trang_thai_don_hang === 'CANCELLED') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không thể thanh toán cho đơn hàng đã bị hủy.',
            ], 409);
        }

        if ($order->payment && $order->payment->trang_thai_thanh_toan === 'SUCCESS') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Đơn hàng này đã được thanh toán thành công trước đó.',
            ], 409);
        }

        $amount = (int) round((float) $order->tong_thanh_toan);
        if ($amount <= 0) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Số tiền thanh toán của đơn hàng không hợp lệ.',
            ], 422);
        }

        date_default_timezone_set('Asia/Ho_Chi_Minh');

        $orderServiceUrl = rtrim((string) (env('ORDER_SERVICE_URL') ?: 'http://127.0.0.1:8000'), '/');
        $vnp_TmnCode = env('VNPAY_TMN_CODE') ?: 'H0FXLGFO';
        $vnp_HashSecret = env('VNPAY_HASH_SECRET') ?: 'IJVDDNUKRJBYDUZUQPYVQCJEIBMTNRRU';
        $vnp_Url = env('VNPAY_URL') ?: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        // ReturnUrl trỏ về Backend callback để xác minh chữ ký, mã giao dịch & số tiền trước khi chuyển về Frontend
        $vnp_Returnurl = "{$orderServiceUrl}/api/payments/vnpay/callback";

        $vnp_TxnRef = $order->ma_don_hang . '_' . time();
        $startTime = date('YmdHis');
        $expire = date('YmdHis', strtotime('+15 minutes', strtotime($startTime)));

        $vnp_OrderInfo = 'Thanh toan don hang StepStyle ' . $order->ma_don_hang;
        $vnp_OrderType = 'billpayment';
        $vnp_Amount = $amount * 100;
        $vnp_Locale = 'vn';
        $vnp_IpAddr = $request->ip() ?? '127.0.0.1';

        $inputData = [
            'vnp_Version'    => '2.1.0',
            'vnp_TmnCode'    => $vnp_TmnCode,
            'vnp_Amount'     => $vnp_Amount,
            'vnp_Command'    => 'pay',
            'vnp_CreateDate' => $startTime,
            'vnp_CurrCode'   => 'VND',
            'vnp_IpAddr'     => $vnp_IpAddr,
            'vnp_Locale'     => $vnp_Locale,
            'vnp_OrderInfo'  => $vnp_OrderInfo,
            'vnp_OrderType'  => $vnp_OrderType,
            'vnp_ReturnUrl'  => $vnp_Returnurl,
            'vnp_TxnRef'     => $vnp_TxnRef,
            'vnp_ExpireDate' => $expire,
        ];

        ksort($inputData);
        $query = '';
        $i = 0;
        $hashdata = '';
        foreach ($inputData as $key => $value) {
            if ($i === 1) {
                $hashdata .= '&' . urlencode($key) . '=' . urlencode((string) $value);
            } else {
                $hashdata .= urlencode($key) . '=' . urlencode((string) $value);
                $i = 1;
            }
            $query .= urlencode($key) . '=' . urlencode((string) $value) . '&';
        }

        $vnp_Url = $vnp_Url . '?' . $query;
        $vnpSecureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
        $vnp_Url .= 'vnp_SecureHash=' . $vnpSecureHash;

        return response()->json([
            'status' => 'success',
            'payUrl' => $vnp_Url,
        ], 200);
    }

    /**
     * Backend tiếp nhận IPN server-to-server từ VNPay.
     * GET /api/payments/vnpay/ipn
     */
    public function vnpayIpn(Request $request)
    {
        $verification = $this->processVnpayVerification($request->query());

        return response()->json([
            'RspCode' => $verification['rsp_code'],
            'Message' => $verification['message'],
        ], 200);
    }

    /**
     * Backend tiếp nhận ReturnUrl callback từ VNPay, xác minh chữ ký/số tiền/mã giao dịch, cập nhật DB, rồi redirect về Frontend.
     * GET /api/payments/vnpay/callback
     */
    public function vnpayCallback(Request $request)
    {
        $verification = $this->processVnpayVerification($request->query());

        $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $query = http_build_query(array_filter([
            'gateway'       => 'vnpay',
            'orderId'       => $verification['order_id'] ?? null,
            'paymentStatus' => $verification['redirect_status'],
            'code'          => $verification['rsp_code'],
        ], fn ($v) => $v !== null && $v !== ''));

        return redirect()->away("{$frontendUrl}/order?{$query}");
    }

    private function processVnpayVerification(array $params): array
    {
        $receivedHash = (string) ($params['vnp_SecureHash'] ?? '');
        if ($receivedHash === '') {
            return [
                'ok'              => false,
                'rsp_code'        => '97',
                'redirect_status' => 'invalid',
                'message'         => 'Invalid signature',
            ];
        }

        $vnp_TmnCode = env('VNPAY_TMN_CODE') ?: 'H0FXLGFO';
        $vnp_HashSecret = env('VNPAY_HASH_SECRET') ?: 'IJVDDNUKRJBYDUZUQPYVQCJEIBMTNRRU';

        $inputData = [];
        foreach ($params as $key => $value) {
            if (!is_string($key) || !str_starts_with($key, 'vnp_')) {
                continue;
            }
            if ($key === 'vnp_SecureHash' || $key === 'vnp_SecureHashType') {
                continue;
            }
            if ($value === null || $value === '') {
                continue;
            }
            $inputData[$key] = (string) $value;
        }

        ksort($inputData);
        $hashParts = [];
        foreach ($inputData as $key => $value) {
            $hashParts[] = urlencode($key) . '=' . urlencode($value);
        }
        $hashData = implode('&', $hashParts);
        $expectedHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);

        if (!hash_equals(strtolower($expectedHash), strtolower($receivedHash))) {
            Log::warning('VNPay callback/IPN signature verification failed', [
                'vnp_TxnRef' => $params['vnp_TxnRef'] ?? null,
            ]);

            return [
                'ok'              => false,
                'rsp_code'        => '97',
                'redirect_status' => 'invalid',
                'message'         => 'Invalid signature',
            ];
        }

        if (($inputData['vnp_TmnCode'] ?? '') !== (string) $vnp_TmnCode) {
            return [
                'ok'              => false,
                'rsp_code'        => '97',
                'redirect_status' => 'invalid',
                'message'         => 'Invalid TmnCode',
            ];
        }

        $txnRef = (string) ($inputData['vnp_TxnRef'] ?? '');
        if (!preg_match('/^(\d+)(?:_\d+)?$/', $txnRef, $matches)) {
            return [
                'ok'              => false,
                'rsp_code'        => '01',
                'redirect_status' => 'invalid',
                'message'         => 'Order not found',
            ];
        }

        if (!isset($inputData['vnp_Amount']) || !is_numeric($inputData['vnp_Amount'])) {
            return [
                'ok'              => false,
                'rsp_code'        => '04',
                'redirect_status' => 'invalid',
                'message'         => 'Invalid amount',
            ];
        }

        $orderId = (int) $matches[1];
        $vnpAmount = (int) $inputData['vnp_Amount'];
        $responseCode = (string) ($inputData['vnp_ResponseCode'] ?? '');
        $transactionStatus = (string) ($inputData['vnp_TransactionStatus'] ?? $responseCode);
        $transactionNo = trim((string) ($inputData['vnp_TransactionNo'] ?? ''));

        return DB::transaction(function () use ($orderId, $vnpAmount, $responseCode, $transactionStatus, $transactionNo) {
            $order = Order::where('ma_don_hang', $orderId)->lockForUpdate()->first();
            if (!$order) {
                return [
                    'ok'              => false,
                    'rsp_code'        => '01',
                    'order_id'        => $orderId,
                    'redirect_status' => 'failed',
                    'message'         => 'Order not found',
                ];
            }

            $payment = Payment::where('ma_don_hang', $order->ma_don_hang)->lockForUpdate()->first();
            if (!$payment) {
                return [
                    'ok'              => false,
                    'rsp_code'        => '01',
                    'order_id'        => $orderId,
                    'redirect_status' => 'failed',
                    'message'         => 'Payment record not found',
                ];
            }

            $expectedVnpAmount = (int) round((float) $order->tong_thanh_toan) * 100;
            if ($vnpAmount !== $expectedVnpAmount) {
                Log::warning('VNPay amount mismatch', [
                    'order_id'        => $orderId,
                    'expected_amount' => $expectedVnpAmount,
                    'received_amount' => $vnpAmount,
                ]);

                return [
                    'ok'              => false,
                    'rsp_code'        => '04',
                    'order_id'        => $orderId,
                    'redirect_status' => 'invalid',
                    'message'         => 'Invalid amount',
                ];
            }

            if ($transactionNo !== '' && $transactionNo !== '0'
                && $this->isTransactionIdUsedByAnotherOrder($transactionNo, (int) $order->ma_don_hang)
            ) {
                return [
                    'ok'              => false,
                    'rsp_code'        => '02',
                    'order_id'        => $orderId,
                    'redirect_status' => 'invalid',
                    'message'         => 'Duplicate transaction',
                ];
            }

            // Chống xử lý lặp (idempotent)
            if ($payment->trang_thai_thanh_toan === 'SUCCESS') {
                return [
                    'ok'              => true,
                    'rsp_code'        => '02',
                    'order_id'        => $orderId,
                    'redirect_status' => 'success',
                    'message'         => 'Order already confirmed',
                ];
            }

            if ($order->trang_thai_don_hang === 'CANCELLED') {
                return [
                    'ok'              => false,
                    'rsp_code'        => '02',
                    'order_id'        => $orderId,
                    'redirect_status' => 'failed',
                    'message'         => 'Order already cancelled',
                ];
            }

            $isSuccess = ($responseCode === '00' && $transactionStatus === '00');
            if ($isSuccess) {
                if ($transactionNo === '' || $transactionNo === '0') {
                    return [
                        'ok'              => false,
                        'rsp_code'        => '97',
                        'order_id'        => $orderId,
                        'redirect_status' => 'invalid',
                        'message'         => 'Missing transaction number',
                    ];
                }

                $updateData = [
                    'trang_thai_thanh_toan' => 'SUCCESS',
                    'ngay_thanh_toan'       => now(),
                ];
                $this->assignPaymentTransactionColumns($updateData, $transactionNo);
                $payment->update($updateData);

                return [
                    'ok'              => true,
                    'rsp_code'        => '00',
                    'order_id'        => $orderId,
                    'redirect_status' => 'success',
                    'message'         => 'Confirm Success',
                ];
            }

            $updateData = [
                'trang_thai_thanh_toan' => 'FAILED',
            ];
            if ($transactionNo !== '' && $transactionNo !== '0') {
                $this->assignPaymentTransactionColumns($updateData, $transactionNo);
            }
            $payment->update($updateData);

            return [
                'ok'              => true,
                'rsp_code'        => '00',
                'order_id'        => $orderId,
                'redirect_status' => 'failed',
                'message'         => 'Confirm Success',
            ];
        });
    }

    private function assignPaymentTransactionColumns(array &$payload, ?string $transactionId): void
    {
        if (Schema::hasColumn('thanhtoan', 'ma_giao_dich_cong')) {
            $payload['ma_giao_dich_cong'] = $transactionId;
        }
        if (Schema::hasColumn('thanhtoan', 'ma_giao_dich_thanh_cong')) {
            $payload['ma_giao_dich_thanh_cong'] = $transactionId;
        }
    }

    private function readPaymentTransactionId(?Payment $payment): ?string
    {
        if (!$payment) {
            return null;
        }

        return $payment->ma_giao_dich_cong
            ?? $payment->ma_giao_dich_thanh_cong
            ?? null;
    }

    private function isTransactionIdUsedByAnotherOrder(string $transactionId, int $orderId): bool
    {
        $hasGatewayCol = Schema::hasColumn('thanhtoan', 'ma_giao_dich_cong');
        $hasLegacyCol = Schema::hasColumn('thanhtoan', 'ma_giao_dich_thanh_cong');

        if (!$hasGatewayCol && !$hasLegacyCol) {
            return false;
        }

        return DB::table('thanhtoan')
            ->where('ma_don_hang', '!=', $orderId)
            ->where(function ($query) use ($transactionId, $hasGatewayCol, $hasLegacyCol) {
                if ($hasGatewayCol) {
                    $query->orWhere('ma_giao_dich_cong', $transactionId);
                }
                if ($hasLegacyCol) {
                    $query->orWhere('ma_giao_dich_thanh_cong', $transactionId);
                }
            })
            ->exists();
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
