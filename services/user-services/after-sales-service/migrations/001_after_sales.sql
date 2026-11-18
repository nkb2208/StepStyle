USE stepstyle_db;

-- ═══ BẢNG DANHGIA: đánh giá sản phẩm sau khi mua ═══
CREATE TABLE IF NOT EXISTS danhgia
(
    ma_danh_gia   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ma_nguoi_dung INT UNSIGNED                          NOT NULL,
    ma_san_pham   INT UNSIGNED                          NOT NULL,
    ma_don_hang   BIGINT UNSIGNED                       NOT NULL,
    so_sao        TINYINT UNSIGNED                      NOT NULL,
    noi_dung      TEXT,
    trang_thai    ENUM ('PENDING', 'APPROVED', 'HIDDEN') NOT NULL DEFAULT 'PENDING',
    ngay_tao      DATETIME                              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME                              NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_danhgia_nguoidung FOREIGN KEY (ma_nguoi_dung)
        REFERENCES nguoidung (ma_nguoi_dung) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_danhgia_sanpham FOREIGN KEY (ma_san_pham)
        REFERENCES sanpham (ma_san_pham) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_danhgia_donhang FOREIGN KEY (ma_don_hang)
        REFERENCES donhang (ma_don_hang) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_danhgia_donhang_sanpham UNIQUE (ma_don_hang, ma_san_pham), -- mỗi sản phẩm trong đơn chỉ đánh giá 1 lần
    CONSTRAINT chk_danhgia_sao CHECK (so_sao BETWEEN 1 AND 5),
    INDEX idx_danhgia_sp_tt (ma_san_pham, trang_thai)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ═══ BẢNG YEUCAUHAUMAI: đổi size / trả hàng / hỗ trợ ═══
CREATE TABLE IF NOT EXISTS yeucauhaumai
(
    ma_yeu_cau         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ma_nguoi_dung      INT UNSIGNED                                                      NOT NULL,
    ma_don_hang        BIGINT UNSIGNED                                                   NOT NULL,
    ma_bien_the        INT UNSIGNED                                                      NULL, -- biến thể đang muốn đổi/trả
    ma_bien_the_moi    INT UNSIGNED                                                      NULL, -- biến thể muốn đổi sang (chỉ với EXCHANGE)
    loai_yeu_cau       ENUM ('EXCHANGE', 'RETURN', 'SUPPORT')                            NOT NULL,
    ly_do              TEXT                                                              NOT NULL,
    trang_thai         ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    phan_hoi_nhan_vien TEXT                                                              NULL,
    ngay_tao           DATETIME                                                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat      DATETIME                                                          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ychm_nguoidung FOREIGN KEY (ma_nguoi_dung)
        REFERENCES nguoidung (ma_nguoi_dung) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ychm_donhang FOREIGN KEY (ma_don_hang)
        REFERENCES donhang (ma_don_hang) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ychm_bienthe FOREIGN KEY (ma_bien_the)
        REFERENCES bienthesanpham (ma_bien_the) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_ychm_bienthe_moi FOREIGN KEY (ma_bien_the_moi)
        REFERENCES bienthesanpham (ma_bien_the) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_ychm_user (ma_nguoi_dung, ngay_tao),
    INDEX idx_ychm_tt (trang_thai, ngay_tao)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
