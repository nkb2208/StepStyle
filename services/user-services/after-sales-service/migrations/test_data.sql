USE stepstyle_db;

-- ============================================================================
-- 1. TẠO NGƯỜI DÙNG MẪU (Dùng INSERT IGNORE để tránh lỗi trùng email)
-- ============================================================================
INSERT IGNORE INTO nguoidung (ho_ten, email, mat_khau, vai_tro) VALUES
('Khach Test', 'khach@test.com', 'x', 'CUSTOMER'),
('Tran Minh Khoa', 'minhkhoa@test.com', 'x', 'CUSTOMER'),
('Nguyen Thi Lan', 'thilan@test.com', 'x', 'CUSTOMER'),
('Le Hoang Nam', 'hoangnam@test.com', 'x', 'CUSTOMER');

SELECT ma_nguoi_dung INTO @user_1 FROM nguoidung WHERE email = 'khach@test.com' LIMIT 1;
SELECT ma_nguoi_dung INTO @user_2 FROM nguoidung WHERE email = 'minhkhoa@test.com' LIMIT 1;
SELECT ma_nguoi_dung INTO @user_3 FROM nguoidung WHERE email = 'thilan@test.com' LIMIT 1;
SELECT ma_nguoi_dung INTO @user_4 FROM nguoidung WHERE email = 'hoangnam@test.com' LIMIT 1;

-- ============================================================================
-- 2. TẠO DANH MỤC SẢN PHẨM
-- ============================================================================
INSERT INTO danhmuc (ten_danh_muc) VALUES ('Sneakers');
SET @cat_sneakers = LAST_INSERT_ID();

INSERT INTO danhmuc (ten_danh_muc) VALUES ('Running');
SET @cat_running = LAST_INSERT_ID();

INSERT INTO danhmuc (ten_danh_muc) VALUES ('Basketball');
SET @cat_basketball = LAST_INSERT_ID();

INSERT INTO danhmuc (ten_danh_muc) VALUES ('Casual & Canvas');
SET @cat_casual = LAST_INSERT_ID();

-- ============================================================================
-- 3. TẠO SẢN PHẨM MẪU (8 sản phẩm)
-- ============================================================================
INSERT INTO sanpham (ten_san_pham, gia_goc, gia_khuyen_mai, mo_ta, hinh_anh_dai_dien, ma_danh_muc)
VALUES ('Nike Air Force 1 Low White', 2900000, 2590000, 'Giay sneaker co dien mau trang de phoi do hang ngay', 'af1_white.png', @cat_sneakers);
SET @sp_1 = LAST_INSERT_ID();

INSERT INTO sanpham (ten_san_pham, gia_goc, gia_khuyen_mai, mo_ta, hinh_anh_dai_dien, ma_danh_muc)
VALUES ('Adidas Samba OG Cloud White', 2700000, 2450000, 'Thiet ke retro bieu tuong voi chat lieu da that va da lon', 'samba_og.png', @cat_sneakers);
SET @sp_2 = LAST_INSERT_ID();

INSERT INTO sanpham (ten_san_pham, gia_goc, gia_khuyen_mai, mo_ta, hinh_anh_dai_dien, ma_danh_muc)
VALUES ('New Balance 550 Vintage Green', 3200000, 2850000, 'Phong cach bong ro thap nien 80 phoi mau xanh reu', 'nb550_green.png', @cat_sneakers);
SET @sp_3 = LAST_INSERT_ID();

INSERT INTO sanpham (ten_san_pham, gia_goc, gia_khuyen_mai, mo_ta, hinh_anh_dai_dien, ma_danh_muc)
VALUES ('Nike Pegasus 41 Volt', 3600000, 3250000, 'Giay chay bo dem ReactX em ai hoan tra nang luong', 'pegasus_41.png', @cat_running);
SET @sp_4 = LAST_INSERT_ID();

INSERT INTO sanpham (ten_san_pham, gia_goc, gia_khuyen_mai, mo_ta, hinh_anh_dai_dien, ma_danh_muc)
VALUES ('Adidas Ultraboost Light', 4500000, 3990000, 'De Boost sieu nhe ho tro chay duong dai', 'ultraboost_light.png', @cat_running);
SET @sp_5 = LAST_INSERT_ID();

INSERT INTO sanpham (ten_san_pham, gia_goc, gia_khuyen_mai, mo_ta, hinh_anh_dai_dien, ma_danh_muc)
VALUES ('ASICS Gel-Kayano 31', 4200000, 3800000, 'Giay chay bo on dinh cao voi cong nghe dem PureGEL', 'kayano_31.png', @cat_running);
SET @sp_6 = LAST_INSERT_ID();

INSERT INTO sanpham (ten_san_pham, gia_goc, gia_khuyen_mai, mo_ta, hinh_anh_dai_dien, ma_danh_muc)
VALUES ('Air Jordan 1 Mid Chicago', 3800000, 3500000, 'Mau giay bong ro huyen thoai phoi mau do den trang', 'aj1_chicago.png', @cat_basketball);
SET @sp_7 = LAST_INSERT_ID();

INSERT INTO sanpham (ten_san_pham, gia_goc, gia_khuyen_mai, mo_ta, hinh_anh_dai_dien, ma_danh_muc)
VALUES ('Converse Chuck 70 High Black', 1950000, 1690000, 'Giay vai canvas co cao de nga vintage ben bi', 'chuck70_black.png', @cat_casual);
SET @sp_8 = LAST_INSERT_ID();

-- ============================================================================
-- 4. TẠO BIẾN THỂ SẢN PHẨM (Size & Màu sắc - 20 biến thể)
-- ============================================================================
-- Biến thể SP 1: Nike Air Force 1
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_1, '40', 'Trang', 15);
SET @bt_1 = LAST_INSERT_ID();
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_1, '41', 'Trang', 20);
SET @bt_2 = LAST_INSERT_ID();
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_1, '42', 'Den', 12);
SET @bt_3 = LAST_INSERT_ID();

-- Biến thể SP 2: Adidas Samba OG
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_2, '39', 'Trang Den', 10);
SET @bt_4 = LAST_INSERT_ID();
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_2, '41', 'Trang Den', 18);
SET @bt_5 = LAST_INSERT_ID();
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_2, '42', 'Den Trang', 9);
SET @bt_6 = LAST_INSERT_ID();

-- Biến thể SP 3: New Balance 550
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_3, '41', 'Trang Xanh Reu', 14);
SET @bt_7 = LAST_INSERT_ID();
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_3, '42', 'Trang Xanh Reu', 11);
SET @bt_8 = LAST_INSERT_ID();

-- Biến thể SP 4: Nike Pegasus 41
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_4, '40', 'Xanh Chuoi', 16);
SET @bt_9 = LAST_INSERT_ID();
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_4, '42', 'Den Xam', 22);
SET @bt_10 = LAST_INSERT_ID();

-- Biến thể SP 5: Adidas Ultraboost Light
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_5, '41', 'Trang', 8);
SET @bt_11 = LAST_INSERT_ID();
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_5, '43', 'Den', 10);
SET @bt_12 = LAST_INSERT_ID();

-- Biến thể SP 6: ASICS Gel-Kayano 31
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_6, '40', 'Xanh Navy', 12);
SET @bt_13 = LAST_INSERT_ID();
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_6, '42', 'Xam Bac', 15);
SET @bt_14 = LAST_INSERT_ID();

-- Biến thể SP 7: Air Jordan 1 Mid Chicago
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_7, '41', 'Do Den Trang', 7);
SET @bt_15 = LAST_INSERT_ID();
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_7, '42', 'Do Den Trang', 6);
SET @bt_16 = LAST_INSERT_ID();
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_7, '43', 'Do Den Trang', 5);
SET @bt_17 = LAST_INSERT_ID();

-- Biến thể SP 8: Converse Chuck 70
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_8, '38', 'Den', 25);
SET @bt_18 = LAST_INSERT_ID();
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_8, '39', 'Trang Kem', 30);
SET @bt_19 = LAST_INSERT_ID();
INSERT INTO bienthesanpham (ma_san_pham, kich_co, mau_sac, so_luong_kho) VALUES (@sp_8, '41', 'Den', 18);
SET @bt_20 = LAST_INSERT_ID();

-- ============================================================================
-- 5. TẠO ĐƠN HÀNG & CHI TIẾT ĐƠN HÀNG MẪU (8 đơn hàng đa trạng thái)
-- ============================================================================

-- Đơn 1: DELIVERED (Khach Test mua 1 Nike AF1 + 1 Converse Chuck 70)
INSERT INTO donhang (ma_nguoi_dung, ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai_don_hang)
VALUES (@user_1, 'Khach Test', '0900000001', '123 Nguyen Hue, Quan 1, TP.HCM', 4280000, 4280000, 'DELIVERED');
SET @dh_1 = LAST_INSERT_ID();

INSERT INTO chitietdonhang (ma_don_hang, ma_bien_the, ten_san_pham, kich_co, mau_sac, so_luong, don_gia) VALUES
(@dh_1, @bt_2, 'Nike Air Force 1 Low White', '41', 'Trang', 1, 2590000),
(@dh_1, @bt_20, 'Converse Chuck 70 High Black', '41', 'Den', 1, 1690000);

-- Đơn 2: DELIVERED (Khach Test mua 1 Air Jordan 1 Mid Chicago)
INSERT INTO donhang (ma_nguoi_dung, ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai_don_hang)
VALUES (@user_1, 'Khach Test', '0900000001', '123 Nguyen Hue, Quan 1, TP.HCM', 3500000, 3500000, 'DELIVERED');
SET @dh_2 = LAST_INSERT_ID();

INSERT INTO chitietdonhang (ma_don_hang, ma_bien_the, ten_san_pham, kich_co, mau_sac, so_luong, don_gia) VALUES
(@dh_2, @bt_16, 'Air Jordan 1 Mid Chicago', '42', 'Do Den Trang', 1, 3500000);

-- Đơn 3: DELIVERED (Tran Minh Khoa mua 1 Adidas Samba OG + 1 Nike Pegasus 41)
INSERT INTO donhang (ma_nguoi_dung, ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai_don_hang)
VALUES (@user_2, 'Tran Minh Khoa', '0912345678', '45 Le Loi, Quan Hai Chau, Da Nang', 5700000, 5700000, 'DELIVERED');
SET @dh_3 = LAST_INSERT_ID();

INSERT INTO chitietdonhang (ma_don_hang, ma_bien_the, ten_san_pham, kich_co, mau_sac, so_luong, don_gia) VALUES
(@dh_3, @bt_5, 'Adidas Samba OG Cloud White', '41', 'Trang Den', 1, 2450000),
(@dh_3, @bt_10, 'Nike Pegasus 41 Volt', '42', 'Den Xam', 1, 3250000);

-- Đơn 4: DELIVERED (Nguyen Thi Lan mua 2 đôi Converse Chuck 70)
INSERT INTO donhang (ma_nguoi_dung, ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai_don_hang)
VALUES (@user_3, 'Nguyen Thi Lan', '0987654321', '88 Pho Hue, Hai Ba Trung, Ha Noi', 3380000, 3380000, 'DELIVERED');
SET @dh_4 = LAST_INSERT_ID();

INSERT INTO chitietdonhang (ma_don_hang, ma_bien_the, ten_san_pham, kich_co, mau_sac, so_luong, don_gia) VALUES
(@dh_4, @bt_18, 'Converse Chuck 70 High Black', '38', 'Den', 1, 1690000),
(@dh_4, @bt_19, 'Converse Chuck 70 High Black', '39', 'Trang Kem', 1, 1690000);

-- Đơn 5: DELIVERED (Le Hoang Nam mua 1 Adidas Ultraboost Light)
INSERT INTO donhang (ma_nguoi_dung, ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai_don_hang)
VALUES (@user_4, 'Le Hoang Nam', '0933445566', '12 Vo Van Tan, Quan 3, TP.HCM', 3990000, 3990000, 'DELIVERED');
SET @dh_5 = LAST_INSERT_ID();

INSERT INTO chitietdonhang (ma_don_hang, ma_bien_the, ten_san_pham, kich_co, mau_sac, so_luong, don_gia) VALUES
(@dh_5, @bt_12, 'Adidas Ultraboost Light', '43', 'Den', 1, 3990000);

-- Đơn 6: SHIPPING (Tran Minh Khoa mua 1 New Balance 550)
INSERT INTO donhang (ma_nguoi_dung, ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai_don_hang)
VALUES (@user_2, 'Tran Minh Khoa', '0912345678', '45 Le Loi, Quan Hai Chau, Da Nang', 2850000, 2850000, 'SHIPPING');
SET @dh_6 = LAST_INSERT_ID();

INSERT INTO chitietdonhang (ma_don_hang, ma_bien_the, ten_san_pham, kich_co, mau_sac, so_luong, don_gia) VALUES
(@dh_6, @bt_8, 'New Balance 550 Vintage Green', '42', 'Trang Xanh Reu', 1, 2850000);

-- Đơn 7: PENDING (Nguyen Thi Lan mua 1 ASICS Gel-Kayano 31)
INSERT INTO donhang (ma_nguoi_dung, ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai_don_hang)
VALUES (@user_3, 'Nguyen Thi Lan', '0987654321', '88 Pho Hue, Hai Ba Trung, Ha Noi', 3800000, 3800000, 'PENDING');
SET @dh_7 = LAST_INSERT_ID();

INSERT INTO chitietdonhang (ma_don_hang, ma_bien_the, ten_san_pham, kich_co, mau_sac, so_luong, don_gia) VALUES
(@dh_7, @bt_13, 'ASICS Gel-Kayano 31', '40', 'Xanh Navy', 1, 3800000);

-- Đơn 8: CANCELLED (Le Hoang Nam đặt 1 Nike Air Force 1 nhưng hủy)
INSERT INTO donhang (ma_nguoi_dung, ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai_don_hang)
VALUES (@user_4, 'Le Hoang Nam', '0933445566', '12 Vo Van Tan, Quan 3, TP.HCM', 2590000, 2590000, 'CANCELLED');
SET @dh_8 = LAST_INSERT_ID();

INSERT INTO chitietdonhang (ma_don_hang, ma_bien_the, ten_san_pham, kich_co, mau_sac, so_luong, don_gia) VALUES
(@dh_8, @bt_3, 'Nike Air Force 1 Low White', '42', 'Den', 1, 2590000);

-- ============================================================================
-- 6. HIỂN THỊ TỔNG HỢP ID VỪA TẠO ĐỂ TIỆN TEST API TRÊN SWAGGER UI
-- ============================================================================
SELECT
    @user_1 AS user_1, @user_2 AS user_2, @user_3 AS user_3, @user_4 AS user_4,
    @sp_1 AS sp_1, @sp_2 AS sp_2, @sp_7 AS sp_7, @sp_8 AS sp_8,
    @dh_1 AS dh_1, @dh_2 AS dh_2, @dh_3 AS dh_3, @dh_4 AS dh_4, @dh_5 AS dh_5;
