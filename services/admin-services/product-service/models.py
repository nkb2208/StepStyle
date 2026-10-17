from sqlalchemy import Column, Integer, String, Text, DECIMAL, Enum, DateTime, ForeignKey
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


class DanhMuc(Base):
    __tablename__ = 'danhmuc'
    ma_danh_muc = Column(Integer, primary_key=True, index=True)
    ten_danh_muc = Column(String(255), nullable=False)
    mo_ta = Column(Text, nullable=True)
    ma_danh_muc_cha = Column(Integer, ForeignKey("danhmuc.ma_danh_muc"))

class BienTheSanPham(Base):
    __tablename__ = 'bienthesanpham'
    ma_bien_the = Column(Integer, primary_key=True, index=True)
    ma_san_pham = Column(Integer, ForeignKey("sanpham.ma_san_pham"))
    kich_co = Column(String(20))
    mau_sac = Column(String(50))
    so_luong_kho = Column(Integer, default=0)
    hinh_anh_bien_the =  Column(String(255))



