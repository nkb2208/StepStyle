-- 001 — Store settings (caidatcuahang + caidatphuongthucthanhtoan + caidatdoitacvanchuyen)
--
-- Applies the Store Settings module to an EXISTING `stepstyle_db`. The shared
-- schema dump (StepStyle-v2.sql) already contains these statements, so this
-- file only needs to be run on databases created before the module existed:
--
--     mysql -u root -p stepstyle_db < migrations/001_store_settings.sql
--
-- Safety:
--   * `CREATE TABLE IF NOT EXISTS` — re-running is a no-op, no existing row is
--     touched, no default value is written over a configured one.
--   * Defaults live in the DDL (`35000` / `500000` / `'Not configured'`) and in
--     the service (`adminfeat.models` / `adminfeat.routers.store`); the service
--     also creates the singleton row and the option catalog on first read, so a
--     database that only got the tables still works.

USE stepstyle_db;

-- 1. Cấu hình cửa hàng (một dòng cho cửa hàng)
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

-- 2. Phương thức thanh toán của cửa hàng
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

-- 3. Đơn vị vận chuyển của cửa hàng
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
