<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent demo data seeder for products, variants, and sample DELIVERED/SHIPPED orders.
 * Runs safely on both fresh and existing MySQL databases without overwriting existing records.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $requiredTables = [
            'nguoidung',
            'danhmuc',
            'sanpham',
            'bienthesanpham',
            'phuongthucthanhtoan',
            'donhang',
            'chitietdonhang',
            'thanhtoan',
        ];

        foreach ($requiredTables as $table) {
            if (!Schema::hasTable($table)) {
                return;
            }
        }

        // 1. Đảm bảo tài khoản mặc định, danh mục và phương thức thanh toán tồn tại
        DB::table('nguoidung')->insertOrIgnore([
            [
                'ma_nguoi_dung' => 1,
                'ho_ten' => 'Administrator',
                'email' => 'admin@gmail.com',
                'mat_khau' => '1234',
                'so_dien_thoai' => '0900000001',
                'dia_chi' => '123 Nguyễn Huệ, Q.1, TP.HCM',
                'vai_tro' => 'ADMIN',
                'trang_thai' => 1,
            ],
            [
                'ma_nguoi_dung' => 3,
                'ho_ten' => 'Nguyễn Văn A',
                'email' => 'test@example.com',
                'mat_khau' => '123456',
                'so_dien_thoai' => '0901234567',
                'dia_chi' => '12 Trần Hưng Đạo, P. Phạm Ngũ Lão, Q.1, TP.HCM',
                'vai_tro' => 'CUSTOMER',
                'trang_thai' => 1,
            ],
        ]);

        DB::table('danhmuc')->insertOrIgnore([
            ['ma_danh_muc' => 1, 'ten_danh_muc' => 'Sneakers', 'mo_ta' => 'Giày thể thao thời trang', 'ma_danh_muc_cha' => null],
            ['ma_danh_muc' => 2, 'ten_danh_muc' => 'Running', 'mo_ta' => 'Giày chạy bộ chuyên dụng', 'ma_danh_muc_cha' => null],
            ['ma_danh_muc' => 3, 'ten_danh_muc' => 'Basketball', 'mo_ta' => 'Giày bóng rổ hiệu năng cao', 'ma_danh_muc_cha' => null],
            ['ma_danh_muc' => 4, 'ten_danh_muc' => 'Lifestyle', 'mo_ta' => 'Giày đi hằng ngày phong cách cổ điển', 'ma_danh_muc_cha' => null],
        ]);

        DB::table('phuongthucthanhtoan')->insertOrIgnore([
            ['ma_phuong_thuc' => 1, 'ten_phuong_thuc' => 'COD (Thanh toán khi nhận hàng)', 'mo_ta' => 'Thanh toán tiền mặt cho shipper khi nhận hàng', 'kich_hoat' => 1],
            ['ma_phuong_thuc' => 2, 'ten_phuong_thuc' => 'Chuyển khoản ngân hàng (VietQR)', 'mo_ta' => 'Chuyển khoản nhanh qua mã QR ngân hàng', 'kich_hoat' => 1],
            ['ma_phuong_thuc' => 3, 'ten_phuong_thuc' => 'Ví điện tử MoMo', 'mo_ta' => 'Thanh toán qua ví MoMo', 'kich_hoat' => 1],
            ['ma_phuong_thuc' => 4, 'ten_phuong_thuc' => 'VNPay QR / Thẻ ATM', 'mo_ta' => 'Thanh toán qua cổng VNPay', 'kich_hoat' => 1],
            ['ma_phuong_thuc' => 5, 'ten_phuong_thuc' => 'Thanh toán qua VNPAY', 'mo_ta' => 'Thanh toán qua cổng VNPAY', 'kich_hoat' => 1],
        ]);

        // 2. Dữ liệu mẫu sản phẩm (5 sản phẩm sẵn + 5 sản phẩm mới = 10 sản phẩm)
        DB::table('sanpham')->insertOrIgnore([
            [
                'ma_san_pham' => 1,
                'ten_san_pham' => 'Ultraboost 5',
                'gia_goc' => 4900000,
                'gia_khuyen_mai' => 4900000,
                'mo_ta' => 'Giày chạy bộ đệm Boost êm ái',
                'hinh_anh_dai_dien' => 'https://i.ebayimg.com/images/g/VlIAAOSwXuReydjX/s-l1200.jpg',
                'trang_thai' => 'ACTIVE',
                'ma_danh_muc' => 1,
            ],
            [
                'ma_san_pham' => 2,
                'ten_san_pham' => "Nike Air Force 1 '07",
                'gia_goc' => 2900000,
                'gia_khuyen_mai' => 2650000,
                'mo_ta' => 'Giày sneaker kinh điển dễ phối đồ',
                'hinh_anh_dai_dien' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
                'trang_thai' => 'ACTIVE',
                'ma_danh_muc' => 1,
            ],
            [
                'ma_san_pham' => 3,
                'ten_san_pham' => 'New Balance 530 White Silver',
                'gia_goc' => 2750000,
                'gia_khuyen_mai' => 2490000,
                'mo_ta' => 'Phong cách retro chạy bộ êm ái',
                'hinh_anh_dai_dien' => 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600',
                'trang_thai' => 'ACTIVE',
                'ma_danh_muc' => 2,
            ],
            [
                'ma_san_pham' => 4,
                'ten_san_pham' => 'Adidas Samba OG Cloud White',
                'gia_goc' => 3100000,
                'gia_khuyen_mai' => 2890000,
                'mo_ta' => 'Thiết kế cổ điển vượt thời gian',
                'hinh_anh_dai_dien' => 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600',
                'trang_thai' => 'ACTIVE',
                'ma_danh_muc' => 4,
            ],
            [
                'ma_san_pham' => 5,
                'ten_san_pham' => 'Jordan 1 Low Bred Toe',
                'gia_goc' => 3600000,
                'gia_khuyen_mai' => 3400000,
                'mo_ta' => 'Phối màu nổi bật cá tính',
                'hinh_anh_dai_dien' => 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600',
                'trang_thai' => 'ACTIVE',
                'ma_danh_muc' => 3,
            ],
            [
                'ma_san_pham' => 6,
                'ten_san_pham' => 'Nike Pegasus 41',
                'gia_goc' => 3650000,
                'gia_khuyen_mai' => 3290000,
                'mo_ta' => 'Giày chạy bộ đệm ReactX kết hợp hai túi Air Zoom đàn hồi tối ưu cho luyện tập hằng ngày.',
                'hinh_anh_dai_dien' => 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600',
                'trang_thai' => 'ACTIVE',
                'ma_danh_muc' => 2,
            ],
            [
                'ma_san_pham' => 7,
                'ten_san_pham' => 'Puma Suede Classic XXI',
                'gia_goc' => 2200000,
                'gia_khuyen_mai' => 1950000,
                'mo_ta' => 'Thiết kế da lộn biểu tượng, phom ôm chân dễ phối cùng phong cách đường phố.',
                'hinh_anh_dai_dien' => 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600',
                'trang_thai' => 'ACTIVE',
                'ma_danh_muc' => 4,
            ],
            [
                'ma_san_pham' => 8,
                'ten_san_pham' => 'ASICS Gel-Kayano 31',
                'gia_goc' => 4200000,
                'gia_khuyen_mai' => 3890000,
                'mo_ta' => 'Giày chạy đường dài ổn định cao với công nghệ đệm FF BLAST PLUS ECO và PureGEL.',
                'hinh_anh_dai_dien' => 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600',
                'trang_thai' => 'ACTIVE',
                'ma_danh_muc' => 2,
            ],
            [
                'ma_san_pham' => 9,
                'ten_san_pham' => 'Converse Chuck 70 High',
                'gia_goc' => 2100000,
                'gia_khuyen_mai' => 1890000,
                'mo_ta' => 'Vải canvas dày dặn, đệm OrthoLite êm ái và đường chỉ khâu vintage cổ điển.',
                'hinh_anh_dai_dien' => 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600',
                'trang_thai' => 'ACTIVE',
                'ma_danh_muc' => 4,
            ],
            [
                'ma_san_pham' => 10,
                'ten_san_pham' => 'Nike Dunk Low Panda',
                'gia_goc' => 3200000,
                'gia_khuyen_mai' => 2990000,
                'mo_ta' => 'Phối màu trắng đen quốc dân, da tổng hợp cao cấp bền bỉ cho mọi trang phục.',
                'hinh_anh_dai_dien' => 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600',
                'trang_thai' => 'ACTIVE',
                'ma_danh_muc' => 1,
            ],
        ]);

        // 3. Biến thể sản phẩm (size & màu sắc kèm tồn kho sẵn sàng mua)
        $variants = [
            // Existing products extra variants
            ['ma_san_pham' => 1, 'kich_co' => '40', 'mau_sac' => 'Trắng', 'so_luong_kho' => 14, 'hinh_anh_bien_the' => 'https://i.ebayimg.com/images/g/VlIAAOSwXuReydjX/s-l1200.jpg'],
            ['ma_san_pham' => 2, 'kich_co' => '42', 'mau_sac' => 'Đen', 'so_luong_kho' => 16, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'],
            ['ma_san_pham' => 3, 'kich_co' => '40', 'mau_sac' => 'Bạc Trắng', 'so_luong_kho' => 12, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600'],
            ['ma_san_pham' => 4, 'kich_co' => '40', 'mau_sac' => 'Trắng Đen', 'so_luong_kho' => 15, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600'],
            ['ma_san_pham' => 5, 'kich_co' => '41', 'mau_sac' => 'Đỏ Đen', 'so_luong_kho' => 10, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600'],

            // Product 6: Nike Pegasus 41
            ['ma_san_pham' => 6, 'kich_co' => '40', 'mau_sac' => 'Trắng', 'so_luong_kho' => 18, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600'],
            ['ma_san_pham' => 6, 'kich_co' => '41', 'mau_sac' => 'Đen Trắng', 'so_luong_kho' => 20, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600'],
            ['ma_san_pham' => 6, 'kich_co' => '42', 'mau_sac' => 'Đen Trắng', 'so_luong_kho' => 15, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600'],

            // Product 7: Puma Suede Classic XXI
            ['ma_san_pham' => 7, 'kich_co' => '39', 'mau_sac' => 'Đen Trắng', 'so_luong_kho' => 14, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600'],
            ['ma_san_pham' => 7, 'kich_co' => '40', 'mau_sac' => 'Đen Trắng', 'so_luong_kho' => 16, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600'],
            ['ma_san_pham' => 7, 'kich_co' => '41', 'mau_sac' => 'Đỏ', 'so_luong_kho' => 10, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600'],

            // Product 8: ASICS Gel-Kayano 31
            ['ma_san_pham' => 8, 'kich_co' => '41', 'mau_sac' => 'Xanh Navy', 'so_luong_kho' => 12, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600'],
            ['ma_san_pham' => 8, 'kich_co' => '42', 'mau_sac' => 'Xanh Navy', 'so_luong_kho' => 11, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600'],
            ['ma_san_pham' => 8, 'kich_co' => '43', 'mau_sac' => 'Xám', 'so_luong_kho' => 9, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600'],

            // Product 9: Converse Chuck 70 High
            ['ma_san_pham' => 9, 'kich_co' => '39', 'mau_sac' => 'Đen', 'so_luong_kho' => 22, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600'],
            ['ma_san_pham' => 9, 'kich_co' => '40', 'mau_sac' => 'Đen', 'so_luong_kho' => 18, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600'],
            ['ma_san_pham' => 9, 'kich_co' => '41', 'mau_sac' => 'Kem', 'so_luong_kho' => 15, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600'],

            // Product 10: Nike Dunk Low Panda
            ['ma_san_pham' => 10, 'kich_co' => '40', 'mau_sac' => 'Trắng Đen', 'so_luong_kho' => 17, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600'],
            ['ma_san_pham' => 10, 'kich_co' => '41', 'mau_sac' => 'Trắng Đen', 'so_luong_kho' => 20, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600'],
            ['ma_san_pham' => 10, 'kich_co' => '42', 'mau_sac' => 'Trắng Đen', 'so_luong_kho' => 15, 'hinh_anh_bien_the' => 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600'],
        ];

        DB::table('bienthesanpham')->insertOrIgnore($variants);

        $findVariantId = function (int $productId, string $size, string $color): ?int {
            $id = DB::table('bienthesanpham')
                ->where('ma_san_pham', $productId)
                ->where('kich_co', $size)
                ->where('mau_sac', $color)
                ->value('ma_bien_the');

            return $id ? (int) $id : null;
        };

        $adminId = DB::table('nguoidung')->where('email', 'admin@gmail.com')->value('ma_nguoi_dung');
        $customerId = DB::table('nguoidung')->where('email', 'test@example.com')->value('ma_nguoi_dung');

        // 4. Seed đơn hàng mẫu (2 đơn DELIVERED cho admin@gmail.com + 1 đơn SHIPPED để test bấm Đã nhận hàng,
        //    và 2 đơn DELIVERED cho test@example.com)
        $demoOrders = [];

        if ($adminId) {
            $demoOrders[] = [
                'order' => [
                    'ma_don_hang' => 2001,
                    'ma_nguoi_dung' => (int) $adminId,
                    'ten_nguoi_nhan' => 'Administrator',
                    'so_dien_thoai_nhan' => '0900000001',
                    'dia_chi_giao_hang' => '123 Nguyễn Huệ, Q.1, TP.HCM',
                    'tong_tien_hang' => 3290000,
                    'tien_giam_gia' => 0,
                    'phi_van_chuyen' => 0,
                    'tong_thanh_toan' => 3290000,
                    'trang_thai_don_hang' => 'DELIVERED',
                    'ghi_chu' => 'Đơn mẫu giao thành công #1 để test đánh giá',
                    'ngay_dat' => '2026-11-20 09:30:00',
                ],
                'items' => [
                    [
                        'ma_bien_the' => $findVariantId(6, '41', 'Đen Trắng'),
                        'ten_san_pham' => 'Nike Pegasus 41',
                        'kich_co' => '41',
                        'mau_sac' => 'Đen Trắng',
                        'so_luong' => 1,
                        'don_gia' => 3290000,
                    ],
                ],
                'payment' => [
                    'ma_phuong_thuc' => 3,
                    'so_tien' => 3290000,
                    'trang_thai_thanh_toan' => 'SUCCESS',
                    'ma_giao_dich_cong' => 'MOMO_DEMO_2001',
                    'ngay_tao' => '2026-11-20 09:30:00',
                    'ngay_thanh_toan' => '2026-11-20 09:32:00',
                ],
            ];

            $demoOrders[] = [
                'order' => [
                    'ma_don_hang' => 2002,
                    'ma_nguoi_dung' => (int) $adminId,
                    'ten_nguoi_nhan' => 'Administrator',
                    'so_dien_thoai_nhan' => '0900000001',
                    'dia_chi_giao_hang' => '123 Nguyễn Huệ, Q.1, TP.HCM',
                    'tong_tien_hang' => 4880000,
                    'tien_giam_gia' => 0,
                    'phi_van_chuyen' => 0,
                    'tong_thanh_toan' => 4880000,
                    'trang_thai_don_hang' => 'DELIVERED',
                    'ghi_chu' => 'Đơn mẫu giao thành công #2 (nhiều sản phẩm) để test đánh giá',
                    'ngay_dat' => '2026-11-22 14:15:00',
                ],
                'items' => [
                    [
                        'ma_bien_the' => $findVariantId(10, '41', 'Trắng Đen'),
                        'ten_san_pham' => 'Nike Dunk Low Panda',
                        'kich_co' => '41',
                        'mau_sac' => 'Trắng Đen',
                        'so_luong' => 1,
                        'don_gia' => 2990000,
                    ],
                    [
                        'ma_bien_the' => $findVariantId(9, '40', 'Đen'),
                        'ten_san_pham' => 'Converse Chuck 70 High',
                        'kich_co' => '40',
                        'mau_sac' => 'Đen',
                        'so_luong' => 1,
                        'don_gia' => 1890000,
                    ],
                ],
                'payment' => [
                    'ma_phuong_thuc' => 1,
                    'so_tien' => 4880000,
                    'trang_thai_thanh_toan' => 'SUCCESS',
                    'ma_giao_dich_cong' => 'COD_DEMO_2002',
                    'ngay_tao' => '2026-11-22 14:15:00',
                    'ngay_thanh_toan' => '2026-11-24 16:00:00',
                ],
            ];

            $demoOrders[] = [
                'order' => [
                    'ma_don_hang' => 2003,
                    'ma_nguoi_dung' => (int) $adminId,
                    'ten_nguoi_nhan' => 'Administrator',
                    'so_dien_thoai_nhan' => '0900000001',
                    'dia_chi_giao_hang' => '123 Nguyễn Huệ, Q.1, TP.HCM',
                    'tong_tien_hang' => 3890000,
                    'tien_giam_gia' => 0,
                    'phi_van_chuyen' => 0,
                    'tong_thanh_toan' => 3890000,
                    'trang_thai_don_hang' => 'SHIPPED',
                    'ghi_chu' => 'Đơn mẫu đang giao hàng để test nút Đã nhận được hàng',
                    'ngay_dat' => '2026-11-26 10:00:00',
                ],
                'items' => [
                    [
                        'ma_bien_the' => $findVariantId(8, '42', 'Xanh Navy'),
                        'ten_san_pham' => 'ASICS Gel-Kayano 31',
                        'kich_co' => '42',
                        'mau_sac' => 'Xanh Navy',
                        'so_luong' => 1,
                        'don_gia' => 3890000,
                    ],
                ],
                'payment' => [
                    'ma_phuong_thuc' => 1,
                    'so_tien' => 3890000,
                    'trang_thai_thanh_toan' => 'PENDING',
                    'ma_giao_dich_cong' => null,
                    'ngay_tao' => '2026-11-26 10:00:00',
                    'ngay_thanh_toan' => null,
                ],
            ];
        }

        if ($customerId) {
            $demoOrders[] = [
                'order' => [
                    'ma_don_hang' => 2004,
                    'ma_nguoi_dung' => (int) $customerId,
                    'ten_nguoi_nhan' => 'Nguyễn Văn A',
                    'so_dien_thoai_nhan' => '0901234567',
                    'dia_chi_giao_hang' => '12 Trần Hưng Đạo, P. Phạm Ngũ Lão, Q.1, TP.HCM',
                    'tong_tien_hang' => 1950000,
                    'tien_giam_gia' => 0,
                    'phi_van_chuyen' => 35000,
                    'tong_thanh_toan' => 1985000,
                    'trang_thai_don_hang' => 'DELIVERED',
                    'ghi_chu' => 'Đơn mẫu giao thành công #1 cho khách test@example.com',
                    'ngay_dat' => '2026-11-21 11:00:00',
                ],
                'items' => [
                    [
                        'ma_bien_the' => $findVariantId(7, '40', 'Đen Trắng'),
                        'ten_san_pham' => 'Puma Suede Classic XXI',
                        'kich_co' => '40',
                        'mau_sac' => 'Đen Trắng',
                        'so_luong' => 1,
                        'don_gia' => 1950000,
                    ],
                ],
                'payment' => [
                    'ma_phuong_thuc' => 1,
                    'so_tien' => 1985000,
                    'trang_thai_thanh_toan' => 'SUCCESS',
                    'ma_giao_dich_cong' => 'COD_DEMO_2004',
                    'ngay_tao' => '2026-11-21 11:00:00',
                    'ngay_thanh_toan' => '2026-11-23 15:20:00',
                ],
            ];

            $demoOrders[] = [
                'order' => [
                    'ma_don_hang' => 2005,
                    'ma_nguoi_dung' => (int) $customerId,
                    'ten_nguoi_nhan' => 'Nguyễn Văn A',
                    'so_dien_thoai_nhan' => '0901234567',
                    'dia_chi_giao_hang' => '12 Trần Hưng Đạo, P. Phạm Ngũ Lão, Q.1, TP.HCM',
                    'tong_tien_hang' => 6280000,
                    'tien_giam_gia' => 0,
                    'phi_van_chuyen' => 0,
                    'tong_thanh_toan' => 6280000,
                    'trang_thai_don_hang' => 'DELIVERED',
                    'ghi_chu' => 'Đơn mẫu giao thành công #2 cho khách test@example.com',
                    'ngay_dat' => '2026-11-23 16:40:00',
                ],
                'items' => [
                    [
                        'ma_bien_the' => $findVariantId(6, '40', 'Trắng'),
                        'ten_san_pham' => 'Nike Pegasus 41',
                        'kich_co' => '40',
                        'mau_sac' => 'Trắng',
                        'so_luong' => 1,
                        'don_gia' => 3290000,
                    ],
                    [
                        'ma_bien_the' => $findVariantId(10, '42', 'Trắng Đen'),
                        'ten_san_pham' => 'Nike Dunk Low Panda',
                        'kich_co' => '42',
                        'mau_sac' => 'Trắng Đen',
                        'so_luong' => 1,
                        'don_gia' => 2990000,
                    ],
                ],
                'payment' => [
                    'ma_phuong_thuc' => 3,
                    'so_tien' => 6280000,
                    'trang_thai_thanh_toan' => 'SUCCESS',
                    'ma_giao_dich_cong' => 'MOMO_DEMO_2005',
                    'ngay_tao' => '2026-11-23 16:40:00',
                    'ngay_thanh_toan' => '2026-11-23 16:42:00',
                ],
            ];
        }

        foreach ($demoOrders as $entry) {
            $orderData = $entry['order'];
            $orderId = $orderData['ma_don_hang'];

            DB::table('donhang')->insertOrIgnore($orderData);

            foreach ($entry['items'] as $item) {
                if (empty($item['ma_bien_the'])) {
                    continue;
                }
                DB::table('chitietdonhang')->insertOrIgnore(array_merge($item, [
                    'ma_don_hang' => $orderId,
                ]));
            }

            if (!DB::table('thanhtoan')->where('ma_don_hang', $orderId)->exists()) {
                DB::table('thanhtoan')->insertOrIgnore(array_merge($entry['payment'], [
                    'ma_don_hang' => $orderId,
                ]));
            }
        }
    }
}
