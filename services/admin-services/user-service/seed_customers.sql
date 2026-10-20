-- Dữ liệu mẫu tài khoản Khách hàng (Customer) cho StepStyle
-- Bảng: nguoidung (Database: stepstyle_db)

INSERT INTO `nguoidung` (`ho_ten`, `email`, `mat_khau`, `so_dien_thoai`, `dia_chi`, `vai_tro`, `trang_thai`, `ngay_tao`) 
VALUES
('Nguyễn Văn An', 'nguyenvanan@gmail.com', '123456', '0912345678', 'Số 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', 'CUSTOMER', 1, '2026-10-01 08:30:00'),
('Trần Thị Mai', 'tranmai99@gmail.com', '123456', '0987654321', '45 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM', 'CUSTOMER', 1, '2026-10-05 14:15:00'),
('Lê Hoàng Long', 'lelong.sneaker@gmail.com', '123456', '0903112233', '78 Quang Trung, Phường 10, Gò Vấp, TP.HCM', 'CUSTOMER', 1, '2026-10-10 09:20:00'),
('Phạm Quỳnh Như', 'quynhnhu.pham@gmail.com', '123456', '0934567890', '12 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội', 'CUSTOMER', 1, '2026-10-12 16:45:00'),
('Hoàng Đức Minh', 'ducminh2002@gmail.com', '123456', '0978998877', '88 Trần Phú, Phường Hải Châu 1, Hải Châu, Đà Nẵng', 'CUSTOMER', 0, '2026-10-15 11:10:00'),
('Đặng Thu Trang', 'trangdang.fashion@gmail.com', '123456', '0961223344', '25 Hai Bà Trưng, Tràng Tiền, Hoàn Kiếm, Hà Nội', 'CUSTOMER', 1, '2026-10-18 19:30:00')
ON DUPLICATE KEY UPDATE `ho_ten` = VALUES(`ho_ten`);
