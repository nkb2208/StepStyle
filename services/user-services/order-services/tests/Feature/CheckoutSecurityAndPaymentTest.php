<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CheckoutSecurityAndPaymentTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->buildTestSchema();
        $this->seedTestData();
    }

    private function buildTestSchema(): void
    {
        Schema::dropAllTables();

        Schema::create('nguoidung', function (Blueprint $table) {
            $table->increments('ma_nguoi_dung');
            $table->string('ho_ten');
            $table->string('email')->unique();
            $table->string('mat_khau');
            $table->string('vai_tro')->default('CUSTOMER');
            $table->boolean('trang_thai')->default(true);
        });

        Schema::create('phuongthucthanhtoan', function (Blueprint $table) {
            $table->increments('ma_phuong_thuc');
            $table->string('ten_phuong_thuc');
            $table->boolean('kich_hoat')->default(true);
        });

        Schema::create('caidatcuahang', function (Blueprint $table) {
            $table->increments('ma_cai_dat');
            $table->string('ten_cua_hang')->default('StepStyle');
            $table->decimal('phi_van_chuyen_co_ban', 15, 0)->default(35000);
            $table->decimal('nguong_mien_phi_van_chuyen', 15, 0)->default(500000);
        });

        Schema::create('magiamgia', function (Blueprint $table) {
            $table->increments('ma_giam_gia');
            $table->string('code_giam_gia')->unique();
            $table->string('loai_giam_gia')->default('PERCENT');
            $table->decimal('gia_tri_giam', 15, 0)->default(0);
            $table->decimal('gia_tri_toi_thieu', 15, 0)->default(0);
            $table->decimal('gia_tri_giam_toi_da', 15, 0)->nullable();
            $table->unsignedInteger('so_luong')->default(0);
            $table->unsignedInteger('so_luong_da_dung')->default(0);
            $table->dateTime('ngay_bat_dau')->nullable();
            $table->dateTime('ngay_ket_thuc')->nullable();
            $table->boolean('kich_hoat')->default(true);
        });

        Schema::create('sanpham', function (Blueprint $table) {
            $table->increments('ma_san_pham');
            $table->string('ten_san_pham');
            $table->decimal('gia_goc', 15, 0)->default(0);
            $table->decimal('gia_khuyen_mai', 15, 0)->nullable();
            $table->string('trang_thai')->default('ACTIVE');
        });

        Schema::create('bienthesanpham', function (Blueprint $table) {
            $table->increments('ma_bien_the');
            $table->unsignedInteger('ma_san_pham');
            $table->string('kich_co', 20);
            $table->string('mau_sac', 50);
            $table->unsignedInteger('so_luong_kho')->default(0);
        });

        Schema::create('giohang', function (Blueprint $table) {
            $table->increments('ma_gio_hang');
            $table->unsignedInteger('ma_nguoi_dung')->unique();
            $table->dateTime('ngay_cap_nhat')->nullable();
        });

        Schema::create('chitietgiohang', function (Blueprint $table) {
            $table->unsignedInteger('ma_gio_hang');
            $table->unsignedInteger('ma_bien_the');
            $table->unsignedInteger('so_luong')->default(1);
            $table->dateTime('ngay_them')->nullable();
            $table->primary(['ma_gio_hang', 'ma_bien_the']);
        });

        Schema::create('donhang', function (Blueprint $table) {
            $table->increments('ma_don_hang');
            $table->unsignedInteger('ma_nguoi_dung')->nullable();
            $table->string('ten_nguoi_nhan');
            $table->string('so_dien_thoai_nhan', 20);
            $table->text('dia_chi_giao_hang');
            $table->decimal('tong_tien_hang', 15, 0)->default(0);
            $table->decimal('tien_giam_gia', 15, 0)->default(0);
            $table->decimal('phi_van_chuyen', 15, 0)->default(0);
            $table->decimal('tong_thanh_toan', 15, 0)->default(0);
            $table->string('trang_thai_don_hang')->default('PENDING');
            $table->unsignedInteger('ma_giam_gia')->nullable();
            $table->text('ghi_chu')->nullable();
            $table->dateTime('ngay_dat')->nullable();
            $table->dateTime('ngay_cap_nhat')->nullable();
        });

        Schema::create('chitietdonhang', function (Blueprint $table) {
            $table->increments('ma_chi_tiet');
            $table->unsignedInteger('ma_don_hang');
            $table->unsignedInteger('ma_bien_the');
            $table->string('ten_san_pham');
            $table->string('kich_co', 20);
            $table->string('mau_sac', 50);
            $table->unsignedInteger('so_luong')->default(1);
            $table->decimal('don_gia', 15, 0)->default(0);
            $table->unique(['ma_don_hang', 'ma_bien_the']);
        });

        Schema::create('thanhtoan', function (Blueprint $table) {
            $table->increments('ma_thanh_toan');
            $table->unsignedInteger('ma_don_hang');
            $table->unsignedInteger('ma_phuong_thuc')->nullable();
            $table->decimal('so_tien', 15, 0)->default(0);
            $table->string('trang_thai_thanh_toan')->default('PENDING');
            $table->string('ma_giao_dich_cong', 100)->nullable();
            $table->dateTime('ngay_tao')->nullable();
            $table->dateTime('ngay_thanh_toan')->nullable();
        });
    }

    private function seedTestData(): void
    {
        DB::table('nguoidung')->insert([
            ['ma_nguoi_dung' => 1, 'ho_ten' => 'Admin', 'email' => 'admin@gmail.com', 'mat_khau' => 'x', 'vai_tro' => 'ADMIN', 'trang_thai' => 1],
            ['ma_nguoi_dung' => 3, 'ho_ten' => 'Khách A', 'email' => 'customer3@example.com', 'mat_khau' => 'x', 'vai_tro' => 'CUSTOMER', 'trang_thai' => 1],
            ['ma_nguoi_dung' => 4, 'ho_ten' => 'Khách B', 'email' => 'customer4@example.com', 'mat_khau' => 'x', 'vai_tro' => 'CUSTOMER', 'trang_thai' => 1],
        ]);

        DB::table('phuongthucthanhtoan')->insert([
            ['ma_phuong_thuc' => 1, 'ten_phuong_thuc' => 'COD', 'kich_hoat' => 1],
            ['ma_phuong_thuc' => 3, 'ten_phuong_thuc' => 'MoMo', 'kich_hoat' => 1],
            ['ma_phuong_thuc' => 4, 'ten_phuong_thuc' => 'VNPay', 'kich_hoat' => 1],
        ]);

        DB::table('caidatcuahang')->insert([
            'ma_cai_dat'                 => 1,
            'ten_cua_hang'               => 'StepStyle',
            'phi_van_chuyen_co_ban'      => 35000,
            'nguong_mien_phi_van_chuyen' => 500000,
        ]);

        DB::table('sanpham')->insert([
            ['ma_san_pham' => 1, 'ten_san_pham' => 'Nike Air Force 1', 'gia_goc' => 300000, 'gia_khuyen_mai' => 200000, 'trang_thai' => 'ACTIVE'],
            ['ma_san_pham' => 2, 'ten_san_pham' => 'Adidas Samba OG', 'gia_goc' => 1000000, 'gia_khuyen_mai' => null, 'trang_thai' => 'ACTIVE'],
        ]);

        DB::table('bienthesanpham')->insert([
            ['ma_bien_the' => 1, 'ma_san_pham' => 1, 'kich_co' => '41', 'mau_sac' => 'Trắng', 'so_luong_kho' => 5],
            ['ma_bien_the' => 2, 'ma_san_pham' => 2, 'kich_co' => '42', 'mau_sac' => 'Đen', 'so_luong_kho' => 2],
        ]);

        DB::table('magiamgia')->insert([
            'ma_giam_gia'         => 1,
            'code_giam_gia'       => 'SAVE10',
            'loai_giam_gia'       => 'PERCENT',
            'gia_tri_giam'        => 10,
            'gia_tri_toi_thieu'   => 100000,
            'gia_tri_giam_toi_da' => 50000,
            'so_luong'            => 5,
            'so_luong_da_dung'    => 0,
            'ngay_bat_dau'        => now()->subDay(),
            'ngay_ket_thuc'       => now()->addDay(),
            'kich_hoat'           => 1,
        ]);
    }

    private function fakeIamAndLoyalty(string $email, string $role = 'CUSTOMER', array $vip = ['discount_percent' => 0, 'free_shipping' => false]): void
    {
        Http::fake([
            '*/api/auth/me' => Http::response([
                'success' => true,
                'data'    => [
                    'user' => [
                        'id'    => 'mongo-id-' . $email,
                        'email' => $email,
                        'name'  => 'Test User',
                        'role'  => $role,
                    ],
                ],
            ], 200),
            '*/api/users/*/vip-benefits' => Http::response($vip, 200),
            '*/api/v1/internal/*' => Http::response(['status' => 'ok'], 200),
        ]);
    }

    public function test_checkout_is_fail_closed_when_auth_service_unreachable_or_returns_500(): void
    {
        $payload = [
            'ma_nguoi_dung'      => 3,
            'ten_nguoi_nhan'     => 'Nguyễn Văn A',
            'so_dien_thoai_nhan' => '0901234567',
            'dia_chi_giao_hang'  => 'TP.HCM',
            'ma_phuong_thuc'     => 1,
            'items'              => [['ma_bien_the' => 1, 'so_luong' => 1]],
        ];

        // 1. Missing token -> 401
        $this->postJson('/api/orders/checkout', $payload)->assertStatus(401);

        // 2. Auth Service connection exception -> 503 (NOT accepted!)
        Http::fake(function () {
            throw new ConnectionException('Connection refused to auth:4000');
        });
        $this->withToken('valid-looking-token')
            ->postJson('/api/orders/checkout', $payload)
            ->assertStatus(503);

        // 3. Auth Service returns 500 -> 503 (NOT accepted!)
        Http::fake([
            '*/api/auth/me' => Http::response(['message' => 'Internal error'], 500),
        ]);
        $this->withToken('valid-looking-token')
            ->postJson('/api/orders/checkout', $payload)
            ->assertStatus(503);

        // Verify no order was created
        $this->assertSame(0, DB::table('donhang')->count());
        $this->assertSame(5, (int) DB::table('bienthesanpham')->where('ma_bien_the', 1)->value('so_luong_kho'));
    }

    public function test_cart_and_order_apis_enforce_ownership_and_staff_roles(): void
    {
        Http::fake([
            '*/api/auth/me' => function ($request) {
                $authHeader = $request->header('Authorization')[0] ?? '';
                if (str_contains($authHeader, 'token-admin')) {
                    return Http::response([
                        'success' => true,
                        'data'    => [
                            'user' => [
                                'id'    => 'mongo-id-admin',
                                'email' => 'admin@gmail.com',
                                'name'  => 'Admin',
                                'role'  => 'ADMIN',
                            ],
                        ],
                    ], 200);
                }

                return Http::response([
                    'success' => true,
                    'data'    => [
                        'user' => [
                            'id'    => 'mongo-id-c3',
                            'email' => 'customer3@example.com',
                            'name'  => 'Customer 3',
                            'role'  => 'CUSTOMER',
                        ],
                    ],
                ], 200);
            },
            '*/api/users/*/vip-benefits' => Http::response(['discount_percent' => 0, 'free_shipping' => false], 200),
            '*/api/v1/internal/*' => Http::response(['status' => 'ok'], 200),
        ]);

        // Customer 3 cannot access/modify Customer 4's cart
        $this->withToken('token-c3')->getJson('/api/cart/4')->assertStatus(403);
        $this->withToken('token-c3')->postJson('/api/cart/add', [
            'ma_nguoi_dung' => 4,
            'ma_bien_the'   => 1,
            'so_luong'      => 1,
        ])->assertStatus(403);
        $this->withToken('token-c3')->putJson('/api/cart/update', [
            'ma_nguoi_dung' => 4,
            'ma_bien_the'   => 1,
            'so_luong'      => 2,
        ])->assertStatus(403);
        $this->withToken('token-c3')->deleteJson('/api/cart/remove', [
            'ma_nguoi_dung' => 4,
            'ma_bien_the'   => 1,
        ])->assertStatus(403);

        // Customer 3 CAN manage their own cart
        $this->withToken('token-c3')->postJson('/api/cart/add', [
            'ma_nguoi_dung' => 3,
            'ma_bien_the'   => 1,
            'so_luong'      => 2,
        ])->assertStatus(200);
        $this->withToken('token-c3')->getJson('/api/cart/3')->assertStatus(200);

        // Customer 3 cannot checkout for Customer 4
        $this->withToken('token-c3')->postJson('/api/orders/checkout', [
            'ma_nguoi_dung'      => 4,
            'ten_nguoi_nhan'     => 'Kẻ tấn công',
            'so_dien_thoai_nhan' => '0900000000',
            'dia_chi_giao_hang'  => 'HCM',
            'ma_phuong_thuc'     => 1,
            'items'              => [['ma_bien_the' => 1, 'so_luong' => 1]],
        ])->assertStatus(403);

        // Seed an order owned by Customer 4
        $orderId = DB::table('donhang')->insertGetId([
            'ma_nguoi_dung'       => 4,
            'ten_nguoi_nhan'      => 'Khách B',
            'so_dien_thoai_nhan'  => '0912345678',
            'dia_chi_giao_hang'   => 'Hà Nội',
            'tong_tien_hang'      => 200000,
            'tien_giam_gia'       => 0,
            'phi_van_chuyen'      => 35000,
            'tong_thanh_toan'     => 235000,
            'trang_thai_don_hang' => 'PENDING',
            'ngay_dat'            => now(),
            'ngay_cap_nhat'       => now(),
        ]);

        // Customer 3 cannot view, cancel, or pay Customer 4's order
        $this->withToken('token-c3')->getJson('/api/orders/user/4')->assertStatus(403);
        $this->withToken('token-c3')->getJson("/api/orders/{$orderId}")->assertStatus(403);
        $this->withToken('token-c3')->getJson("/api/orders/{$orderId}/payment-status")->assertStatus(403);
        $this->withToken('token-c3')->putJson("/api/orders/{$orderId}/cancel")->assertStatus(403);
        $this->withToken('token-c3')->postJson("/api/orders/{$orderId}/momo")->assertStatus(403);
        $this->withToken('token-c3')->postJson("/api/orders/{$orderId}/vnpay")->assertStatus(403);

        // Customer 3 cannot call admin endpoints
        $this->withToken('token-c3')->getJson('/api/orders')->assertStatus(403);
        $this->withToken('token-c3')->putJson("/api/orders/{$orderId}/status", [
            'trang_thai_don_hang' => 'PROCESSING',
        ])->assertStatus(403);
        $this->withToken('token-c3')->putJson("/api/orders/{$orderId}/payment", [
            'trang_thai_thanh_toan' => 'SUCCESS',
        ])->assertStatus(403);

        // Admin CAN call admin endpoints
        $this->withToken('token-admin')->getJson('/api/orders')->assertStatus(200);
        $this->withToken('token-admin')->putJson("/api/orders/{$orderId}/status", [
            'trang_thai_don_hang' => 'PROCESSING',
        ])->assertStatus(200);
    }

    public function test_checkout_ignores_tampered_frontend_price_shipping_and_discount(): void
    {
        // Customer 3 has 5% VIP discount, NOT free shipping
        $this->fakeIamAndLoyalty('customer3@example.com', 'CUSTOMER', [
            'discount_percent' => 5,
            'free_shipping'    => false,
            'tier'             => 'SILVER',
        ]);

        // Frontend tries to tamper: don_gia=1, phi_van_chuyen=0, tien_giam_gia=999999
        // Real DB price for variant 1 (sanpham 1): gia_khuyen_mai = 200,000 * 2 = 400,000 (< 500,000 free-ship threshold)
        // Expected shipping: 35,000 from caidatcuahang
        // Expected VIP discount: 5% of 400,000 = 20,000
        // Expected Voucher SAVE10: 10% of 400,000 = 40,000 (<= 50,000 max cap)
        // Expected total discount: 60,000
        // Expected tong_thanh_toan: 400,000 - 60,000 + 35,000 = 375,000
        $res = $this->withToken('token-c3')->postJson('/api/orders/checkout', [
            'ma_nguoi_dung'      => 3,
            'ten_nguoi_nhan'     => 'Nguyễn Văn A',
            'so_dien_thoai_nhan' => '0901234567',
            'dia_chi_giao_hang'  => 'TP.HCM',
            'ma_phuong_thuc'     => 1,
            'phi_van_chuyen'     => 0,
            'tien_giam_gia'      => 999999,
            'code_giam_gia'      => 'SAVE10',
            'items'              => [
                [
                    'ma_bien_the'  => 1,
                    'ten_san_pham' => 'Fake Shoe Name',
                    'kich_co'      => '99',
                    'mau_sac'      => 'Fake Color',
                    'so_luong'     => 2,
                    'don_gia'      => 1,
                ],
            ],
        ]);

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertEquals(400000, (int) $data['tong_tien_hang']);
        $this->assertEquals(60000, (int) $data['tien_giam_gia']);
        $this->assertEquals(35000, (int) $data['phi_van_chuyen']);
        $this->assertEquals(375000, (int) $data['tong_thanh_toan']);
        $this->assertEquals(200000, (int) $data['items'][0]['don_gia']);
        $this->assertEquals('Nike Air Force 1', $data['items'][0]['ten_san_pham']);
        $this->assertEquals('41', $data['items'][0]['kich_co']);
        $this->assertEquals('Trắng', $data['items'][0]['mau_sac']);
        $this->assertEquals(3, (int) DB::table('bienthesanpham')->where('ma_bien_the', 1)->value('so_luong_kho'));
        $this->assertEquals(1, (int) DB::table('magiamgia')->where('ma_giam_gia', 1)->value('so_luong_da_dung'));
    }

    public function test_checkout_checks_stock_decrement_and_rolls_back_on_insufficient_stock(): void
    {
        $this->fakeIamAndLoyalty('customer3@example.com', 'CUSTOMER');

        // Variant 1 has stock 5 (enough for qty 2), Variant 2 has stock 2 (NOT enough for qty 3)
        $res = $this->withToken('token-c3')->postJson('/api/orders/checkout', [
            'ma_nguoi_dung'      => 3,
            'ten_nguoi_nhan'     => 'Nguyễn Văn A',
            'so_dien_thoai_nhan' => '0901234567',
            'dia_chi_giao_hang'  => 'TP.HCM',
            'ma_phuong_thuc'     => 1,
            'items'              => [
                ['ma_bien_the' => 1, 'so_luong' => 2],
                ['ma_bien_the' => 2, 'so_luong' => 3],
            ],
        ]);

        $res->assertStatus(409);

        // Both variants MUST remain completely untouched (atomic rollback)
        $this->assertSame(5, (int) DB::table('bienthesanpham')->where('ma_bien_the', 1)->value('so_luong_kho'));
        $this->assertSame(2, (int) DB::table('bienthesanpham')->where('ma_bien_the', 2)->value('so_luong_kho'));
        $this->assertSame(0, DB::table('donhang')->count());
        $this->assertSame(0, DB::table('thanhtoan')->count());
    }

    public function test_cancel_order_is_atomic_and_prevents_duplicate_stock_restoration(): void
    {
        $this->fakeIamAndLoyalty('customer3@example.com', 'CUSTOMER');

        // Place order for 2 units of variant 1 (stock 5 -> 3) with voucher 1 (used 0 -> 1)
        $checkout = $this->withToken('token-c3')->postJson('/api/orders/checkout', [
            'ma_nguoi_dung'      => 3,
            'ten_nguoi_nhan'     => 'Nguyễn Văn A',
            'so_dien_thoai_nhan' => '0901234567',
            'dia_chi_giao_hang'  => 'TP.HCM',
            'ma_phuong_thuc'     => 1,
            'ma_giam_gia'        => 1,
            'items'              => [['ma_bien_the' => 1, 'so_luong' => 2]],
        ])->assertStatus(200);

        $orderId = (int) $checkout->json('data.ma_don_hang');
        $this->assertSame(3, (int) DB::table('bienthesanpham')->where('ma_bien_the', 1)->value('so_luong_kho'));
        $this->assertSame(1, (int) DB::table('magiamgia')->where('ma_giam_gia', 1)->value('so_luong_da_dung'));

        // First cancel succeeds -> stock restored 3 -> 5, voucher usage restored 1 -> 0
        $this->withToken('token-c3')
            ->putJson("/api/orders/{$orderId}/cancel")
            ->assertStatus(200);

        $this->assertSame('CANCELLED', DB::table('donhang')->where('ma_don_hang', $orderId)->value('trang_thai_don_hang'));
        $this->assertSame(5, (int) DB::table('bienthesanpham')->where('ma_bien_the', 1)->value('so_luong_kho'));
        $this->assertSame(0, (int) DB::table('magiamgia')->where('ma_giam_gia', 1)->value('so_luong_da_dung'));

        // Second cancel MUST fail with 409 and NOT restore stock or voucher again
        $this->withToken('token-c3')
            ->putJson("/api/orders/{$orderId}/cancel")
            ->assertStatus(409);

        $this->assertSame(5, (int) DB::table('bienthesanpham')->where('ma_bien_the', 1)->value('so_luong_kho'));
        $this->assertSame(0, (int) DB::table('magiamgia')->where('ma_giam_gia', 1)->value('so_luong_da_dung'));
    }

    public function test_momo_ipn_and_callback_verify_signature_amount_and_idempotency(): void
    {
        $this->fakeIamAndLoyalty('customer3@example.com', 'CUSTOMER');

        $checkout = $this->withToken('token-c3')->postJson('/api/orders/checkout', [
            'ma_nguoi_dung'      => 3,
            'ten_nguoi_nhan'     => 'Nguyễn Văn A',
            'so_dien_thoai_nhan' => '0901234567',
            'dia_chi_giao_hang'  => 'TP.HCM',
            'ma_phuong_thuc'     => 3,
            'items'              => [['ma_bien_the' => 1, 'so_luong' => 1]],
        ])->assertStatus(200);

        $orderId = (int) $checkout->json('data.ma_don_hang');
        $expectedAmount = (int) $checkout->json('data.tong_thanh_toan'); // 200,000 + 35,000 = 235,000

        $partnerCode = env('MOMO_PARTNER_CODE') ?: 'MOMOBKUN20180529';
        $accessKey = env('MOMO_ACCESS_KEY') ?: 'klm05TvNBzhg7h7j';
        $secretKey = env('MOMO_SECRET_KEY') ?: 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa';

        $buildMomoPayload = function (int $amount, string $transId, int $resultCode = 0, bool $corruptSig = false) use ($orderId, $partnerCode, $accessKey, $secretKey) {
            $payload = [
                'partnerCode'  => $partnerCode,
                'orderId'      => "{$orderId}_1700000000",
                'requestId'    => "{$orderId}_1700000000",
                'amount'       => $amount,
                'orderInfo'    => "Thanh toan don hang #{$orderId}",
                'orderType'    => 'momo_wallet',
                'transId'      => $transId,
                'resultCode'   => $resultCode,
                'message'      => 'Successful.',
                'payType'      => 'qr',
                'responseTime' => 1700000100,
                'extraData'    => '',
            ];
            $rawHash = "accessKey={$accessKey}&amount={$payload['amount']}&extraData={$payload['extraData']}&message={$payload['message']}&orderId={$payload['orderId']}&orderInfo={$payload['orderInfo']}&orderType={$payload['orderType']}&partnerCode={$payload['partnerCode']}&payType={$payload['payType']}&requestId={$payload['requestId']}&responseTime={$payload['responseTime']}&resultCode={$payload['resultCode']}&transId={$payload['transId']}";
            $payload['signature'] = $corruptSig ? 'invalid_signature_value' : hash_hmac('sha256', $rawHash, $secretKey);
            return $payload;
        };

        // 1. Invalid signature -> 400, payment remains PENDING
        $this->postJson('/api/payments/momo/ipn', $buildMomoPayload($expectedAmount, 'MOMO_TX_01', 0, true))
            ->assertStatus(400)
            ->assertJsonPath('code', 'INVALID_SIGNATURE');
        $this->assertSame('PENDING', DB::table('thanhtoan')->where('ma_don_hang', $orderId)->value('trang_thai_thanh_toan'));

        // 2. Tampered amount (even with valid signature) -> 400, payment remains PENDING
        $this->postJson('/api/payments/momo/ipn', $buildMomoPayload(1000, 'MOMO_TX_02', 0, false))
            ->assertStatus(400)
            ->assertJsonPath('code', 'INVALID_AMOUNT');
        $this->assertSame('PENDING', DB::table('thanhtoan')->where('ma_don_hang', $orderId)->value('trang_thai_thanh_toan'));

        // 3. Valid signed IPN -> 200, payment updated to SUCCESS with transId
        $this->postJson('/api/payments/momo/ipn', $buildMomoPayload($expectedAmount, 'MOMO_TX_REAL', 0, false))
            ->assertStatus(200)
            ->assertJsonPath('code', 'PAYMENT_CONFIRMED');
        $this->assertSame('SUCCESS', DB::table('thanhtoan')->where('ma_don_hang', $orderId)->value('trang_thai_thanh_toan'));
        $this->assertSame('MOMO_TX_REAL', DB::table('thanhtoan')->where('ma_don_hang', $orderId)->value('ma_giao_dich_cong'));

        // 4. Duplicate IPN -> 200 ALREADY_CONFIRMED (idempotent)
        $this->postJson('/api/payments/momo/ipn', $buildMomoPayload($expectedAmount, 'MOMO_TX_REAL', 0, false))
            ->assertStatus(200)
            ->assertJsonPath('code', 'ALREADY_CONFIRMED');

        // 5. Frontend queries authoritative backend payment status
        $this->withToken('token-c3')
            ->getJson("/api/orders/{$orderId}/payment-status")
            ->assertStatus(200)
            ->assertJsonPath('data.trang_thai_thanh_toan', 'SUCCESS')
            ->assertJsonPath('data.ma_giao_dich', 'MOMO_TX_REAL');
    }

    public function test_vnpay_ipn_and_callback_verify_signature_amount_and_redirect(): void
    {
        $this->fakeIamAndLoyalty('customer3@example.com', 'CUSTOMER');

        $checkout = $this->withToken('token-c3')->postJson('/api/orders/checkout', [
            'ma_nguoi_dung'      => 3,
            'ten_nguoi_nhan'     => 'Nguyễn Văn A',
            'so_dien_thoai_nhan' => '0901234567',
            'dia_chi_giao_hang'  => 'TP.HCM',
            'ma_phuong_thuc'     => 4,
            'items'              => [['ma_bien_the' => 2, 'so_luong' => 1]],
        ])->assertStatus(200);

        $orderId = (int) $checkout->json('data.ma_don_hang');
        $expectedAmount = (int) $checkout->json('data.tong_thanh_toan'); // 1,000,000 (free shipping >= 500,000)
        $this->assertSame(1000000, $expectedAmount);

        // Verify payment_vnpay URL points ReturnUrl to Backend callback
        $payInit = $this->withToken('token-c3')
            ->postJson("/api/orders/{$orderId}/vnpay")
            ->assertStatus(200);
        $this->assertStringContainsString(urlencode('/api/payments/vnpay/callback'), $payInit->json('payUrl'));

        $tmnCode = env('VNPAY_TMN_CODE') ?: 'H0FXLGFO';
        $hashSecret = env('VNPAY_HASH_SECRET') ?: 'IJVDDNUKRJBYDUZUQPYVQCJEIBMTNRRU';

        $buildVnpayQuery = function (int $vnpAmount, string $txNo, string $respCode = '00', bool $corruptSig = false) use ($orderId, $tmnCode, $hashSecret) {
            $params = [
                'vnp_Amount'            => (string) $vnpAmount,
                'vnp_BankCode'          => 'NCB',
                'vnp_OrderInfo'         => "Thanh toan don hang StepStyle {$orderId}",
                'vnp_ResponseCode'      => $respCode,
                'vnp_TmnCode'           => $tmnCode,
                'vnp_TransactionNo'     => $txNo,
                'vnp_TransactionStatus' => $respCode,
                'vnp_TxnRef'            => "{$orderId}_1700000000",
            ];
            ksort($params);
            $parts = [];
            foreach ($params as $k => $v) {
                $parts[] = urlencode($k) . '=' . urlencode($v);
            }
            $params['vnp_SecureHash'] = $corruptSig ? 'badhash' : hash_hmac('sha512', implode('&', $parts), $hashSecret);
            return http_build_query($params);
        };

        // 1. Invalid signature -> RspCode 97
        $this->getJson('/api/payments/vnpay/ipn?' . $buildVnpayQuery($expectedAmount * 100, 'VNP_TX_01', '00', true))
            ->assertStatus(200)
            ->assertJsonPath('RspCode', '97');
        $this->assertSame('PENDING', DB::table('thanhtoan')->where('ma_don_hang', $orderId)->value('trang_thai_thanh_toan'));

        // 2. Wrong amount -> RspCode 04
        $this->getJson('/api/payments/vnpay/ipn?' . $buildVnpayQuery(500000, 'VNP_TX_02', '00', false))
            ->assertStatus(200)
            ->assertJsonPath('RspCode', '04');
        $this->assertSame('PENDING', DB::table('thanhtoan')->where('ma_don_hang', $orderId)->value('trang_thai_thanh_toan'));

        // 3. Valid callback updates DB and redirects to Frontend /order
        $callbackRes = $this->get('/api/payments/vnpay/callback?' . $buildVnpayQuery($expectedAmount * 100, 'VNP_TX_REAL', '00', false));
        $callbackRes->assertStatus(302);
        $this->assertStringContainsString('/order?gateway=vnpay', (string) $callbackRes->headers->get('Location'));
        $this->assertStringContainsString('paymentStatus=success', (string) $callbackRes->headers->get('Location'));

        $this->assertSame('SUCCESS', DB::table('thanhtoan')->where('ma_don_hang', $orderId)->value('trang_thai_thanh_toan'));
        $this->assertSame('VNP_TX_REAL', DB::table('thanhtoan')->where('ma_don_hang', $orderId)->value('ma_giao_dich_cong'));

        // 4. Subsequent IPN after callback -> RspCode 02 (Order already confirmed, idempotent)
        $this->getJson('/api/payments/vnpay/ipn?' . $buildVnpayQuery($expectedAmount * 100, 'VNP_TX_REAL', '00', false))
            ->assertStatus(200)
            ->assertJsonPath('RspCode', '02');
    }

    public function test_newly_registered_iam_user_is_auto_synced_and_keeps_ownership_isolation(): void
    {
        // Email not present in seeded nguoidung table, MongoDB string id
        $this->fakeIamAndLoyalty('newbuyer@example.com', 'CUSTOMER');

        // Can add to own cart without passing ma_nguoi_dung
        $this->withToken('token-newbuyer')->postJson('/api/cart/add', [
            'ma_bien_the' => 1,
            'so_luong'    => 1,
        ])->assertStatus(200);

        // Can fetch own cart via /api/cart/me
        $this->withToken('token-newbuyer')->getJson('/api/cart/me')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data.items');

        // Still CANNOT access Customer 3's cart or orders (403 Forbidden)
        $this->withToken('token-newbuyer')->getJson('/api/cart/3')->assertStatus(403);
        $this->withToken('token-newbuyer')->getJson('/api/orders/user/3')->assertStatus(403);

        // Can checkout own order and view via /api/orders/me
        $this->withToken('token-newbuyer')->postJson('/api/orders/checkout', [
            'ten_nguoi_nhan'     => 'Người mua mới',
            'so_dien_thoai_nhan' => '0911222333',
            'dia_chi_giao_hang'  => 'TP.HCM',
            'ma_phuong_thuc'     => 1,
            'items'              => [['ma_bien_the' => 1, 'so_luong' => 1]],
        ])->assertStatus(200);

        $this->withToken('token-newbuyer')->getJson('/api/orders/me')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }
}
