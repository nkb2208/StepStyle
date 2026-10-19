CREATE DATABASE IF NOT EXISTS stepstyle_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE stepstyle_db;

-- 1. BẢNG NGUOIDUNG
CREATE TABLE IF NOT EXISTS nguoidung
(
    ma_nguoi_dung INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ho_ten        VARCHAR(255)                        NOT NULL,
    email         VARCHAR(255) UNIQUE                 NOT NULL,
    mat_khau      VARCHAR(255)                        NOT NULL,
    so_dien_thoai VARCHAR(20),
    dia_chi       TEXT,
    vai_tro       ENUM ('CUSTOMER', 'ADMIN', 'STAFF') NOT NULL DEFAULT 'CUSTOMER',
    trang_thai    BOOLEAN                             NOT NULL DEFAULT TRUE,
    ngay_tao      DATETIME                            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME                            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 2. BẢNG DANHMUC
CREATE TABLE IF NOT EXISTS danhmuc
(
    ma_danh_muc     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ten_danh_muc    VARCHAR(255) NOT NULL,
    mo_ta           TEXT,
    ma_danh_muc_cha INT UNSIGNED DEFAULT NULL,
    CONSTRAINT fk_danhmuc_danhmuccha FOREIGN KEY (ma_danh_muc_cha)
        REFERENCES danhmuc (ma_danh_muc)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 3. BẢNG MAGIAMGIA
CREATE TABLE IF NOT EXISTS magiamgia
(
    ma_giam_gia         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code_giam_gia       VARCHAR(50) UNIQUE               NOT NULL,
    loai_giam_gia       ENUM ('PERCENT', 'FIXED_AMOUNT') NOT NULL DEFAULT 'PERCENT',
    gia_tri_giam        DECIMAL(15, 0)                   NOT NULL DEFAULT 0,
    gia_tri_toi_thieu   DECIMAL(15, 0)                   NOT NULL DEFAULT 0,
    gia_tri_giam_toi_da DECIMAL(15, 0)                            DEFAULT NULL,
    so_luong            INT UNSIGNED                     NOT NULL DEFAULT 0,
    so_luong_da_dung    INT UNSIGNED                     NOT NULL DEFAULT 0,
    ngay_bat_dau        DATETIME,
    ngay_ket_thuc       DATETIME,
    kich_hoat           BOOLEAN                          NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_mgg CHECK (
        gia_tri_giam >= 0
            AND (loai_giam_gia <> 'PERCENT' OR gia_tri_giam <= 100)
            AND (ngay_ket_thuc IS NULL OR ngay_bat_dau IS NULL OR ngay_ket_thuc > ngay_bat_dau)
            AND so_luong_da_dung <= so_luong
        )
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 4. BẢNG PHUONGTHUCTHANHTOAN
CREATE TABLE IF NOT EXISTS phuongthucthanhtoan
(
    ma_phuong_thuc  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ten_phuong_thuc VARCHAR(100) NOT NULL,
    mo_ta           TEXT,
    kich_hoat       BOOLEAN      NOT NULL DEFAULT TRUE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 5. BẢNG SANPHAM
CREATE TABLE IF NOT EXISTS sanpham
(
    ma_san_pham       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ten_san_pham      VARCHAR(255)                NOT NULL,
    gia_goc           DECIMAL(15, 0)              NOT NULL DEFAULT 0,
    gia_khuyen_mai    DECIMAL(15, 0)                       DEFAULT NULL,
    mo_ta             TEXT,
    hinh_anh_dai_dien VARCHAR(255),
    trang_thai        ENUM ('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    ma_danh_muc       INT UNSIGNED,
    ngay_tao          DATETIME                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat     DATETIME                    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sanpham_danhmuc FOREIGN KEY (ma_danh_muc)
        REFERENCES danhmuc (ma_danh_muc)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT chk_sp_gia CHECK (gia_goc >= 0 AND (gia_khuyen_mai IS NULL OR gia_khuyen_mai <= gia_goc)),
    INDEX idx_sanpham_dm_tt_ngay (ma_danh_muc, trang_thai, ngay_tao),
    FULLTEXT KEY ft_sanpham_ten (ten_san_pham)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 6. BẢNG BIENTHESANPHAM
CREATE TABLE IF NOT EXISTS bienthesanpham
(
    ma_bien_the       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ma_san_pham       INT UNSIGNED NOT NULL,
    kich_co           VARCHAR(20)  NOT NULL,
    mau_sac           VARCHAR(50)  NOT NULL,
    so_luong_kho      INT UNSIGNED NOT NULL DEFAULT 0,
    hinh_anh_bien_the VARCHAR(255),
    CONSTRAINT fk_bienthe_sanpham FOREIGN KEY (ma_san_pham)
        REFERENCES sanpham (ma_san_pham)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT uq_bienthe UNIQUE (ma_san_pham, kich_co, mau_sac),
    CONSTRAINT chk_bienthe_kho CHECK (so_luong_kho >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 7. BẢNG GIOHANG
CREATE TABLE IF NOT EXISTS giohang
(
    ma_gio_hang   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ma_nguoi_dung INT UNSIGNED UNIQUE NOT NULL,
    ngay_cap_nhat DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_giohang_nguoidung FOREIGN KEY (ma_nguoi_dung)
        REFERENCES nguoidung (ma_nguoi_dung)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 8. BẢNG CHITIETGIOHANG
CREATE TABLE IF NOT EXISTS chitietgiohang
(
    ma_gio_hang INT UNSIGNED NOT NULL,
    ma_bien_the INT UNSIGNED NOT NULL,
    so_luong    INT UNSIGNED NOT NULL DEFAULT 1,
    ngay_them   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_gio_hang, ma_bien_the),
    CONSTRAINT fk_chitietgiohang_giohang FOREIGN KEY (ma_gio_hang)
        REFERENCES giohang (ma_gio_hang)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_chitietgiohang_bienthe FOREIGN KEY (ma_bien_the)
        REFERENCES bienthesanpham (ma_bien_the)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_ctgh_sl CHECK (so_luong > 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 9. BẢNG DONHANG
CREATE TABLE IF NOT EXISTS donhang
(
    ma_don_hang         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ma_nguoi_dung       INT UNSIGNED,
    ten_nguoi_nhan      VARCHAR(255)                                                        NOT NULL,
    so_dien_thoai_nhan  VARCHAR(20)                                                         NOT NULL,
    dia_chi_giao_hang   TEXT                                                                NOT NULL,
    tong_tien_hang      DECIMAL(15, 0)                                                      NOT NULL DEFAULT 0,
    tien_giam_gia       DECIMAL(15, 0)                                                      NOT NULL DEFAULT 0,
    phi_van_chuyen      DECIMAL(15, 0)                                                      NOT NULL DEFAULT 0,
    tong_thanh_toan     DECIMAL(15, 0)                                                      NOT NULL DEFAULT 0,
    trang_thai_don_hang ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    ma_giam_gia         INT UNSIGNED,
    ghi_chu             TEXT,
    ngay_dat            DATETIME                                                            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat       DATETIME                                                            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_donhang_nguoidung FOREIGN KEY (ma_nguoi_dung)
        REFERENCES nguoidung (ma_nguoi_dung)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_donhang_magiamgia FOREIGN KEY (ma_giam_gia)
        REFERENCES magiamgia (ma_giam_gia)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT chk_dh_tong CHECK (tong_thanh_toan = tong_tien_hang - tien_giam_gia + phi_van_chuyen),
    INDEX idx_donhang_user_ngay (ma_nguoi_dung, ngay_dat),
    INDEX idx_donhang_tt_ngay (trang_thai_don_hang, ngay_dat)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 10. BẢNG CHITIETDONHANG
CREATE TABLE IF NOT EXISTS chitietdonhang
(
    ma_chi_tiet  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ma_don_hang  BIGINT UNSIGNED NOT NULL,
    ma_bien_the  INT UNSIGNED    NOT NULL,
    ten_san_pham VARCHAR(255)    NOT NULL,           -- Snapshot tên sản phẩm tại thời điểm mua
    kich_co      VARCHAR(20)     NOT NULL,           -- Snapshot kích cỡ
    mau_sac      VARCHAR(50)     NOT NULL,           -- Snapshot màu sắc
    so_luong     INT UNSIGNED    NOT NULL DEFAULT 1,
    don_gia      DECIMAL(15, 0)  NOT NULL DEFAULT 0, -- Snapshot đơn giá tại thời điểm mua
    CONSTRAINT fk_chitietdonhang_donhang FOREIGN KEY (ma_don_hang)
        REFERENCES donhang (ma_don_hang)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_chitietdonhang_bienthe FOREIGN KEY (ma_bien_the)
        REFERENCES bienthesanpham (ma_bien_the)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT uq_ctdh_donhang_bienthe UNIQUE (ma_don_hang, ma_bien_the),
    CONSTRAINT chk_ctdh_sl CHECK (so_luong > 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 11. BẢNG THANHTOAN
CREATE TABLE IF NOT EXISTS thanhtoan
(
    ma_thanh_toan         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ma_don_hang           BIGINT UNSIGNED                                   NOT NULL,
    ma_phuong_thuc        INT UNSIGNED,
    so_tien               DECIMAL(15, 0)                                    NOT NULL DEFAULT 0,
    trang_thai_thanh_toan ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    ma_giao_dich_cong     VARCHAR(100)                                               DEFAULT NULL,
    ngay_tao              DATETIME                                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_thanh_toan       DATETIME                                                   DEFAULT NULL,
    CONSTRAINT fk_thanhtoan_donhang FOREIGN KEY (ma_don_hang)
        REFERENCES donhang (ma_don_hang)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_thanhtoan_phuongthuc FOREIGN KEY (ma_phuong_thuc)
        REFERENCES phuongthucthanhtoan (ma_phuong_thuc)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT uq_thanhtoan_giaodich UNIQUE (ma_phuong_thuc, ma_giao_dich_cong)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 12. BẢNG CAIDATCUAHANG — cấu hình cửa hàng (một dòng cho cửa hàng)
CREATE TABLE IF NOT EXISTS caidatcuahang
(
    ma_cai_dat                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ten_cua_hang               VARCHAR(255) NOT NULL                                  DEFAULT 'Not configured',
    email_lien_he              VARCHAR(255)                                           DEFAULT NULL,
    so_dien_thoai              VARCHAR(20)                                            DEFAULT NULL,
    -- Địa chỉ kho chính có cấu trúc 4 lớp (dùng cho tính phí vận chuyển sau này)
    dia_chi_kho                VARCHAR(255)                                           DEFAULT NULL,
    phuong_xa                  VARCHAR(100)                                           DEFAULT NULL,
    quan_huyen                 VARCHAR(100)                                           DEFAULT NULL,
    tinh_thanh                 VARCHAR(100)                                           DEFAULT NULL,
    -- Tiền tệ lưu dạng số nguyên VND (DECIMAL(15,0)), không dùng chuỗi/float
    phi_van_chuyen_co_ban      DECIMAL(15, 0)                                         NOT NULL DEFAULT 35000,
    nguong_mien_phi_van_chuyen DECIMAL(15, 0)                                         NOT NULL DEFAULT 500000,
    ngay_tao                   DATETIME                                               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat              DATETIME                                               NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_cdch_phi CHECK (
        phi_van_chuyen_co_ban >= 0
            AND nguong_mien_phi_van_chuyen >= 0
    )
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 13. BẢNG CAIDATPHUONGTHUCTHANHTOAN — bật/tắt phương thức thanh toán của cửa hàng
CREATE TABLE IF NOT EXISTS caidatphuongthucthanhtoan
(
    ma_cai_dat_phuong_thuc INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ma_cai_dat             INT UNSIGNED NOT NULL,
    -- Mã ổn định (cod, card, momo, …) — không dùng tên hiển thị làm khóa dữ liệu
    code_phuong_thuc       VARCHAR(30)  NOT NULL,
    ten_phuong_thuc        VARCHAR(100) NOT NULL,
    mo_ta                  VARCHAR(255)                                DEFAULT NULL,
    kich_hoat              BOOLEAN      NOT NULL                       DEFAULT FALSE,
    CONSTRAINT fk_caidatpt_caidatcuahang FOREIGN KEY (ma_cai_dat)
        REFERENCES caidatcuahang (ma_cai_dat)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT uq_caidatpt_code UNIQUE (ma_cai_dat, code_phuong_thuc)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 14. BẢNG CAIDATDOITACVANCHUYEN — bật/tắt đơn vị vận chuyển của cửa hàng
CREATE TABLE IF NOT EXISTS caidatdoitacvanchuyen
(
    ma_cai_dat_doi_tac INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ma_cai_dat         INT UNSIGNED NOT NULL,
    -- Mã ổn định (ghtk, ghn, jnt, viettelpost) — cột cau_hinh thêm sau không đổi cấu trúc
    code_doi_tac       VARCHAR(30)  NOT NULL,
    ten_doi_tac        VARCHAR(100) NOT NULL,
    mo_ta              VARCHAR(255)                                DEFAULT NULL,
    kich_hoat          BOOLEAN      NOT NULL                       DEFAULT FALSE,
    CONSTRAINT fk_caidatdt_caidatcuahang FOREIGN KEY (ma_cai_dat)
        REFERENCES caidatcuahang (ma_cai_dat)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT uq_caidatdt_code UNIQUE (ma_cai_dat, code_doi_tac)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ============================================================================
-- DỮ LIỆU MẪU KHỞI TẠO (SEED DATA)
-- ============================================================================
SET NAMES utf8mb4;

INSERT IGNORE INTO nguoidung (ma_nguoi_dung, ho_ten, email, mat_khau, so_dien_thoai, dia_chi, vai_tro, trang_thai) VALUES
(1, 'Administrator', 'admin@gmail.com', '1234', '0900000001', '123 Nguyễn Huệ, Q.1, TP.HCM', 'ADMIN', TRUE),
(2, 'Bình Ngô', 'admin1@gmail.com', '123456', '0900000002', '45 Lê Lợi, Q.1, TP.HCM', 'ADMIN', TRUE),
(3, 'Nguyễn Văn A', 'test@example.com', '123456', '0901234567', '12 Trần Hưng Đạo, P. Phạm Ngũ Lão, Q.1, TP.HCM', 'CUSTOMER', TRUE),
(4, 'Trần Thị Bích', 'bichtran@gmail.com', '123456', '0912345678', '88 Cầu Giấy, P. Quan Hoa, Q. Cầu Giấy, Hà Nội', 'CUSTOMER', TRUE),
(5, 'Lê Hoàng Nam', 'namle@gmail.com', '123456', '0987654321', '210 Nguyễn Văn Linh, Q. Hải Châu, Đà Nẵng', 'CUSTOMER', TRUE),
(6, 'Phạm Minh Tuấn', 'tuanpham@gmail.com', '123456', '0933445566', '56 Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức, TP.HCM', 'CUSTOMER', TRUE),
(7, 'Võ Thị Mai', 'maivo@gmail.com', '123456', '0977889900', '19 Phan Chu Trinh, TP. Huế', 'CUSTOMER', FALSE);

INSERT IGNORE INTO danhmuc (ma_danh_muc, ten_danh_muc, mo_ta, ma_danh_muc_cha) VALUES
(1, 'Sneakers', 'Giày thể thao thời trang', NULL),
(2, 'Running', 'Giày chạy bộ chuyên dụng', NULL),
(3, 'Basketball', 'Giày bóng rổ hiệu năng cao', NULL),
(4, 'Lifestyle', 'Giày đi hằng ngày phong cách cổ điển', NULL);

INSERT IGNORE INTO sanpham (ma_san_pham, ten_san_pham, gia_goc, gia_khuyen_mai, mo_ta, hinh_anh_dai_dien, trang_thai, ma_danh_muc) VALUES
(1, 'Ultraboost 5', 4900000, 4900000, 'Giày chạy bộ đệm Boost êm ái', 'https://i.ebayimg.com/images/g/VlIAAOSwXuReydjX/s-l1200.jpg', 'ACTIVE', 1),
(2, 'Nike Air Force 1 ''07', 2900000, 2650000, 'Giày sneaker kinh điển dễ phối đồ', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', 'ACTIVE', 1),
(3, 'New Balance 530 White Silver', 2750000, 2490000, 'Phong cách retro chạy bộ êm ái', 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600', 'ACTIVE', 2),
(4, 'Adidas Samba OG Cloud White', 3100000, 2890000, 'Thiết kế cổ điển vượt thời gian', 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600', 'ACTIVE', 4),
(5, 'Jordan 1 Low Bred Toe', 3600000, 3400000, 'Phối màu nổi bật cá tính', 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600', 'ACTIVE', 3);

INSERT IGNORE INTO bienthesanpham (ma_bien_the, ma_san_pham, kich_co, mau_sac, so_luong_kho, hinh_anh_bien_the) VALUES
(1, 1, '41', 'Trắng', 15, 'https://i.ebayimg.com/images/g/VlIAAOSwXuReydjX/s-l1200.jpg'),
(2, 1, '42', 'Đen', 12, 'https://i.ebayimg.com/images/g/VlIAAOSwXuReydjX/s-l1200.jpg'),
(3, 2, '40', 'Trắng', 20, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
(4, 2, '41', 'Trắng', 18, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
(5, 3, '39', 'Bạc Trắng', 10, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600'),
(6, 3, '42', 'Bạc Trắng', 8, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600'),
(7, 4, '41', 'Trắng Đen', 14, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600'),
(8, 5, '42', 'Đỏ Đen', 6, 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600');

INSERT IGNORE INTO phuongthucthanhtoan (ma_phuong_thuc, ten_phuong_thuc, mo_ta, kich_hoat) VALUES
(1, 'COD (Thanh toán khi nhận hàng)', 'Thanh toán tiền mặt cho shipper khi nhận hàng', TRUE),
(2, 'Chuyển khoản ngân hàng (VietQR)', 'Chuyển khoản nhanh qua mã QR ngân hàng', TRUE),
(3, 'Ví điện tử MoMo', 'Thanh toán qua ví MoMo', TRUE),
(4, 'VNPay QR / Thẻ ATM', 'Thanh toán qua cổng VNPay', TRUE);

INSERT IGNORE INTO donhang (ma_don_hang, ma_nguoi_dung, ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_giao_hang, tong_tien_hang, tien_giam_gia, phi_van_chuyen, tong_thanh_toan, trang_thai_don_hang, ghi_chu, ngay_dat) VALUES
(1001, 3, 'Nguyễn Văn A', '0901234567', '12 Trần Hưng Đạo, P. Phạm Ngũ Lão, Q.1, TP.HCM', 7550000, 200000, 0, 7350000, 'PENDING', 'Giao giờ hành chính giúp mình nhé', '2026-10-19 08:30:00'),
(1002, 4, 'Trần Thị Bích', '0912345678', '88 Cầu Giấy, P. Quan Hoa, Q. Cầu Giấy, Hà Nội', 2490000, 0, 35000, 2525000, 'PENDING', 'Gọi trước khi giao 15 phút', '2026-10-19 09:45:00'),
(1003, 5, 'Lê Hoàng Nam', '0987654321', '210 Nguyễn Văn Linh, Q. Hải Châu, Đà Nẵng', 5780000, 150000, 0, 5630000, 'PROCESSING', 'Đóng gói kỹ hộp nguyên vẹn làm quà tặng', '2026-10-18 14:20:00'),
(1004, 6, 'Phạm Minh Tuấn', '0933445566', '56 Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức, TP.HCM', 3400000, 0, 35000, 3435000, 'PROCESSING', NULL, '2026-10-18 16:10:00'),
(1005, 3, 'Nguyễn Văn A', '0901234567', '12 Trần Hưng Đạo, P. Phạm Ngũ Lão, Q.1, TP.HCM', 4900000, 100000, 0, 4800000, 'SHIPPED', 'Gửi bảo vệ tòa nhà nếu không nghe máy', '2026-10-17 10:15:00'),
(1006, 4, 'Trần Thị Bích', '0912345678', '88 Cầu Giấy, P. Quan Hoa, Q. Cầu Giấy, Hà Nội', 5540000, 240000, 0, 5300000, 'DELIVERED', 'Khách hàng thân thiết', '2026-10-15 11:00:00'),
(1007, 5, 'Lê Hoàng Nam', '0987654321', '210 Nguyễn Văn Linh, Q. Hải Châu, Đà Nẵng', 2490000, 0, 35000, 2525000, 'DELIVERED', NULL, '2026-10-12 15:30:00'),
(1008, 7, 'Võ Thị Mai', '0977889900', '19 Phan Chu Trinh, TP. Huế', 3400000, 0, 35000, 3435000, 'CANCELLED', 'Khách đổi ý muốn chọn mẫu khác', '2026-10-10 09:20:00');

INSERT IGNORE INTO chitietdonhang (ma_chi_tiet, ma_don_hang, ma_bien_the, ten_san_pham, kich_co, mau_sac, so_luong, don_gia) VALUES
(1, 1001, 1, 'Ultraboost 5', '41', 'Trắng', 1, 4900000),
(2, 1001, 3, 'Nike Air Force 1 ''07', '40', 'Trắng', 1, 2650000),
(3, 1002, 5, 'New Balance 530 White Silver', '39', 'Bạc Trắng', 1, 2490000),
(4, 1003, 7, 'Adidas Samba OG Cloud White', '41', 'Trắng Đen', 2, 2890000),
(5, 1004, 8, 'Jordan 1 Low Bred Toe', '42', 'Đỏ Đen', 1, 3400000),
(6, 1005, 2, 'Ultraboost 5', '42', 'Đen', 1, 4900000),
(7, 1006, 4, 'Nike Air Force 1 ''07', '41', 'Trắng', 1, 2650000),
(8, 1006, 7, 'Adidas Samba OG Cloud White', '41', 'Trắng Đen', 1, 2890000),
(9, 1007, 6, 'New Balance 530 White Silver', '42', 'Bạc Trắng', 1, 2490000),
(10, 1008, 8, 'Jordan 1 Low Bred Toe', '42', 'Đỏ Đen', 1, 3400000);

INSERT IGNORE INTO thanhtoan (ma_thanh_toan, ma_don_hang, ma_phuong_thuc, so_tien, trang_thai_thanh_toan, ma_giao_dich_cong, ngay_tao, ngay_thanh_toan) VALUES
(1, 1001, 1, 7350000, 'PENDING', NULL, '2026-10-19 08:30:00', NULL),
(2, 1002, 2, 2525000, 'SUCCESS', 'VQR20261019002', '2026-10-19 09:45:00', '2026-10-19 09:46:12'),
(3, 1003, 3, 5630000, 'SUCCESS', 'MOMO20261018003', '2026-10-18 14:20:00', '2026-10-18 14:21:05'),
(4, 1004, 1, 3435000, 'PENDING', NULL, '2026-10-18 16:10:00', NULL),
(5, 1005, 4, 4800000, 'SUCCESS', 'VNP20261017005', '2026-10-17 10:15:00', '2026-10-17 10:16:30'),
(6, 1006, 2, 5300000, 'SUCCESS', 'VQR20261015006', '2026-10-15 11:00:00', '2026-10-15 11:02:00'),
(7, 1007, 1, 2525000, 'SUCCESS', 'COD20261012007', '2026-10-12 15:30:00', '2026-10-14 17:00:00'),
(8, 1008, 1, 3435000, 'FAILED', NULL, '2026-10-10 09:20:00', NULL);

