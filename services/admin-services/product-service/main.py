
import models
from models import SanPham, DanhMuc, BienTheSanPham
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.params import Depends
from sqlalchemy.orm import Session
from typing import Annotated
from starlette import status
from database import SessionLocal,engine

app = FastAPI()

class SanPhamRequest(BaseModel):
    ten_san_pham:str
    gia_goc:float
    gia_khuyen_mai:float
    mo_ta :str
    hinh_anh_dai_dien:str
    trang_thai:str = 'ACTIVE'
    ma_danh_muc:int | None = None

class DanhMucRequest(BaseModel):
    ten_danh_muc:str
    mo_ta:str
    ma_danh_muc_cha:int

class BienTheSanPhamRequest(BaseModel):
    ma_san_pham:int
    kich_co:str
    mau_sac:str
    so_luong_kho:int = 0
    hinh_anh_bien_the: str

models.Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]


# get all products
@app.get("/products")
async def get_all_products(db:db_dependency):
    return db.query(SanPham).all()

@app.get("/products/{id}")
async def get_all_products(id:int,db:db_dependency):
    product = db.query(SanPham).filter(SanPham.ma_san_pham == id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"khong tim thay san pham co id:{id}")
    return product

# create product
@app.post("/products/create")
async def create_product(product: SanPhamRequest, db: db_dependency):
    product_model = SanPham(**product.dict())
    db.add(product_model)
    db.commit()
    return product_model

# update product by id
@app.put("/products/update/{id}")
async def update_product(id:int, db:db_dependency, update_product: SanPhamRequest):
    product = db.query(SanPham).filter(SanPham.ma_san_pham == id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"khong tim thay san pham co id:{id}")

    product.ten_san_pham = update_product.ten_san_pham
    product.gia_goc = update_product.gia_goc
    product.gia_khuyen_mai = update_product.gia_khuyen_mai
    product.mo_ta = update_product.mo_ta
    product.hinh_anh_dai_dien = update_product.hinh_anh_dai_dien
    product.ma_danh_muc = update_product.ma_danh_muc

    db.add(product)
    db.commit()
    db.refresh(product)
    return "Cap nhat san pham thanh cong"

# delte product by id
@app.delete("/products/delete/{id}")
async def delete_product(id:int, db:db_dependency):
    product = db.query(SanPham).filter(SanPham.ma_san_pham == id).first()
    if not product:
        raise HTTPException(status_code= 404, detail="fkhong tim thay san pham co id:{id}")
    db.delete(product)
    db.commit()

    return "Xoa thanh cong"

# find product by category, name and status
@app.get("/products/find")
async def find_product(db:db_dependency,product_name: str | None = None, product_status:str | None = None, product_category:int | None = None):
    products = db.query(SanPham).filter(SanPham.ten_san_pham.ilike(f"%{product_name}%"),
                                         SanPham.trang_thai.ilike(f"%{product_status}%"),
                                         SanPham.ma_danh_muc.ilike(f"%{product_category}%")).all()
    if not products:
        raise HTTPException(status_code=404, detail="khong tim thay san pham")

    return products