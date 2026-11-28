<?php

use App\Http\Controllers\CartController;
use App\Http\Controllers\OrderController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('cart')->group(function () {
    Route::get('/me', [CartController::class, 'getMyCart']);
    Route::post('/add', [CartController::class, 'addToCart']);
    Route::get('/{userID}', [CartController::class, 'getCart']);
    Route::put('/update', [CartController::class, 'updateQuantity']);
    Route::delete('/remove', [CartController::class, 'deleteItem']);
});

Route::prefix('orders')->group(function () {
    Route::get('/', [OrderController::class, 'getAllOrders']);
    Route::get('/me', [OrderController::class, 'getMyOrders']);
    Route::post('/checkout', [OrderController::class, 'checkout']);
    Route::get('/user/{userId}', [OrderController::class, 'getOrders']);
    Route::get('/{orderId}', [OrderController::class, 'getOrderDetail']);
    Route::get('/{orderId}/payment-status', [OrderController::class, 'getPaymentStatus']);
    Route::put('/{orderId}/cancel', [OrderController::class, 'cancelOrder']);
    Route::put('/{orderId}/confirm-received', [OrderController::class, 'confirmReceived']);
    Route::put('/{orderId}/status', [OrderController::class, 'updateOrderStatus']);
    Route::put('/{orderId}/payment', [OrderController::class, 'updatePaymentStatus']);
    Route::post('/{orderId}/momo', [OrderController::class, 'payment_momo']);
    Route::post('/{orderId}/vnpay', [OrderController::class, 'payment_vnpay']);
});

// Callback & IPN từ cổng thanh toán MoMo / VNPay (Backend tự xác minh chữ ký, mã giao dịch & số tiền)
Route::prefix('payments')->group(function () {
    Route::post('/momo/ipn', [OrderController::class, 'momoIpn']);
    Route::get('/momo/callback', [OrderController::class, 'momoCallback']);
    Route::get('/vnpay/ipn', [OrderController::class, 'vnpayIpn']);
    Route::get('/vnpay/callback', [OrderController::class, 'vnpayCallback']);
});

// Internal API contract for downstream services (e.g., after-sales-service)
Route::prefix('internal/orders')->group(function () {
    Route::get('/{orderId}/verify-purchase', [OrderController::class, 'verifyPurchase']);
});
