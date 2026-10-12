<?php

use Illuminate\Http\Request;
use App\Http\Controllers\CartController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrderController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');



Route::prefix('cart')->group(function(){
    Route::post('/add', [CartController::class, 'addToCart']);
    Route::get('/{userID}', [CartController::class, 'getCart']);
    Route::put('/update', [CartController::class, 'updateQuantity']);
    Route::delete('/remove', [CartController::class, 'deleteItem']);
});

Route::prefix('orders')->group(function () {
    Route::get('/', [OrderController::class, 'getAllOrders']);
    Route::post('/checkout', [OrderController::class, 'checkout']);               
    Route::get('/user/{userId}', [OrderController::class, 'getOrders']);      
    Route::get('/{orderId}', [OrderController::class, 'getOrderDetail']);         
    Route::put('/{orderId}/cancel', [OrderController::class, 'cancelOrder']);
    Route::put('/{orderId}/status', [OrderController::class, 'updateOrderStatus']); 
    Route::put('/{orderId}/payment', [OrderController::class, 'updatePaymentStatus']);     
});
