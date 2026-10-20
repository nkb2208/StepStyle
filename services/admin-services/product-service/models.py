from sqlalchemy import Column, Integer, String, Text, DECIMAL, Enum, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class SanPham(Base):
    __tablename__ = 'sanpham'
    ma_san_pham = Column(Integer, primary_key=True, index=True)
    ten_san_pham = Column(String(255), nullable=False)
    gia_goc = Column(DECIMAL(15,0), nullable=False)
    gia_khuyen_mai = Column(DECIMAL(15,0), nullable=False)
    mo_ta = Column(Text, nullable=True)
    hinh_anh_dai_dien = Column(String(255), nullable=True)
    trang_thai = Column(Enum( 'ACTIVE', 'INACTIVE'), default = 'ACTIVE')
    ma_danh_muc = Column(Integer, ForeignKey("danhmuc.ma_danh_muc"))
    ngay_tao = Column(DateTime, server_default=func.now())
    ngay_cap_nhat = Column(DateTime, server_default=func.now(), onupdate=func.now())
    danh_sach_bien_the = relationship("BienTheSanPham", back_populates="san_pham")
    danh_muc = relationship("DanhMuc", back_populates="danh_sach_san_pham")


class DanhMuc(Base):
    __tablename__ = 'danhmuc'
    ma_danh_muc = Column(Integer, primary_key=True, index=True)
    ten_danh_muc = Column(String(255), nullable=False)
    mo_ta = Column(Text, nullable=True)
    ma_danh_muc_cha = Column(Integer, ForeignKey("danhmuc.ma_danh_muc"))
    danh_sach_san_pham = relationship("SanPham", back_populates="danh_muc")

    danh_muc_con = relationship("DanhMuc", back_populates="danh_muc_cha", foreign_keys=[ma_danh_muc_cha])
    danh_muc_cha = relationship("DanhMuc", back_populates="danh_muc_con", remote_side=[ma_danh_muc])

class BienTheSanPham(Base):
    __tablename__ = 'bienthesanpham'
    ma_bien_the = Column(Integer, primary_key=True, index=True)
    ma_san_pham = Column(Integer, ForeignKey("sanpham.ma_san_pham"))
    kich_co = Column(String(20))
    mau_sac = Column(String(50))
    so_luong_kho = Column(Integer, default=0)
    hinh_anh_bien_the =  Column(String(255))

    san_pham = relationship("SanPham", back_populates="danh_sach_bien_the")


# ── System settings (caidat* tables, shared with system-config-service) ──────

class CaiDatCuaHang(Base):
    """Store settings — one row for the shop (`caidatcuahang`)."""

    __tablename__ = 'caidatcuahang'
    ma_cai_dat = Column(Integer, primary_key=True, index=True)
    ten_cua_hang = Column(String(255), nullable=False, default='Not configured')
    email_lien_he = Column(String(255))
    so_dien_thoai = Column(String(20))
    dia_chi_kho = Column(String(255))
    phuong_xa = Column(String(100))
    quan_huyen = Column(String(100))
    tinh_thanh = Column(String(100))
    phi_van_chuyen_co_ban = Column(DECIMAL(15, 0), nullable=False, default=35000)
    nguong_mien_phi_van_chuyen = Column(DECIMAL(15, 0), nullable=False, default=500000)
    ngay_tao = Column(DateTime, server_default=func.now())
    ngay_cap_nhat = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CaiDatPhuongThucThanhToan(Base):
    """Toggleable payment method of the store (`caidatphuongthucthanhtoan`)."""

    __tablename__ = 'caidatphuongthucthanhtoan'

    ma_cai_dat_phuong_thuc = Column(Integer, primary_key=True, index=True)
    ma_cai_dat = Column(Integer, ForeignKey("caidatcuahang.ma_cai_dat"), nullable=False)
    code_phuong_thuc = Column(String(30), nullable=False)
    ten_phuong_thuc = Column(String(100), nullable=False)
    mo_ta = Column(String(255))
    kich_hoat = Column(Boolean, nullable=False, default=False)


class CaiDatDoiTacVanChuyen(Base):
    """Toggleable shipping carrier of the store (`caidatdoitacvanchuyen`)."""

    __tablename__ = 'caidatdoitacvanchuyen'

    ma_cai_dat_doi_tac = Column(Integer, primary_key=True, index=True)
    ma_cai_dat = Column(Integer, ForeignKey("caidatcuahang.ma_cai_dat"), nullable=False)
    code_doi_tac = Column(String(30), nullable=False)
    ten_doi_tac = Column(String(100), nullable=False)
    mo_ta = Column(String(255))
    kich_hoat = Column(Boolean, nullable=False, default=False)

