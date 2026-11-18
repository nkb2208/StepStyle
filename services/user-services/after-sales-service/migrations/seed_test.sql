USE stepstyle_db;
-- 1 khách (nếu chưa seed), 1 danh mục, 1 sản phẩm, 1 biến thể
INSERT INTO nguoidung (ho_ten,email,mat_khau,vai_tro) VALUES ('Khach Test','khach@test.com','x','CUSTOMER');
INSERT INTO danhmuc (ten_danh_muc) VALUES ('Sneakers');
INSERT INTO sanpham (ten_san_pham,gia_goc,gia_khuyen_mai,mo_ta,hinh_anh_dai_dien,ma_danh_muc)
  VALUES ('Giay Test',1000000,900000,'mo ta','x.png',LAST_INSERT_ID());
INSERT INTO bienthesanpham (ma_san_pham,kich_co,mau_sac,so_luong_kho)
  VALUES (LAST_INSERT_ID(),'42','Den',10);
-- 1 đơn đã giao + chi tiết
INSERT INTO donhang (ma_nguoi_dung,ten_nguoi_nhan,so_dien_thoai_nhan,dia_chi_giao_hang,
  tong_tien_hang,tong_thanh_toan,trang_thai_don_hang)
  SELECT ma_nguoi_dung,'Khach Test','0900000000','HCM',900000,900000,'DELIVERED'
  FROM nguoidung WHERE email='khach@test.com';
INSERT INTO chitietdonhang (ma_don_hang,ma_bien_the,ten_san_pham,kich_co,mau_sac,so_luong,don_gia)
  VALUES (LAST_INSERT_ID(),(SELECT MAX(ma_bien_the) FROM bienthesanpham),'Giay Test','42','Den',1,900000);