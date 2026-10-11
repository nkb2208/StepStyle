<?php

use Illuminate\Http\Request;
use App\Http\Controllers\CartController;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');



Route::prefix('cart')->group(function(){
    Route::post('/cart/add', [CartController::class, 'addToCart']);
    Route::get('/{userID}', [CartController::class, 'getCart']);
    Route::put('/update', [CartController::class, 'updateQuantity']);
    Route::delete('/delete', [CartController::class, 'deleteItem']);
});
