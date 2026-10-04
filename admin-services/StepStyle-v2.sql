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
