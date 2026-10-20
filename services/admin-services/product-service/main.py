import os
import models
from models import SanPham, DanhMuc, BienTheSanPham
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.params import Depends
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal, engine
from fastapi.middleware.cors import CORSMiddleware
from security import require_admin
from settings_router import router as settings_router

app = FastAPI(
    title="StepStyle Product Service",
    description=(
        "Product catalog (categories, products, variants) **and** system "
        "settings (store information, payment-method toggles, shipping-carrier "
        "toggles) under `/api/v1/settings`."
    ),
)

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://localhost:4000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store configuration endpoints (`/api/v1/settings/...`) documented in the
# same Swagger UI as the product catalog.
app.include_router(settings_router)


@app.get("/health", tags=["discovery"])
async def health():
    return {"status": "ok"}

class BienTheSanPhamRequest(BaseModel):
    ma_san_pham: int
    kich_co: str
    mau_sac: str
    so_luong_kho: int = 0
    hinh_anh_bien_the: str | None = None

class BienTheResponse(BaseModel):
    ma_bien_the: int
    kich_co: str
    mau_sac: str
    so_luong_kho: int
    hinh_anh_bien_the: str | None = None

    class Config:
        from_attributes = True

class SanPhamRequest(BaseModel):
    ten_san_pham:str
    gia_goc:float
    gia_khuyen_mai:float
    mo_ta :str
    hinh_anh_dai_dien:str
    trang_thai:str = 'ACTIVE'
    ma_danh_muc:int | None = None

class SanPhamResponse(BaseModel):
    ma_san_pham: int  
    ten_san_pham: str
    gia_goc: float
    gia_khuyen_mai: float
    hinh_anh_dai_dien: str
    trang_thai: str
    ma_danh_muc: int | None

    danh_sach_bien_the: list[BienTheResponse] = []

    class Config:
        from_attributes = True

class DanhMucRequest(BaseModel):
    ten_danh_muc:str
    mo_ta:str |None = None
    ma_danh_muc_cha:int | None = None

class DanhMucResponse(BaseModel):
    ma_danh_muc: int
    ten_danh_muc: str
    mo_ta: str | None = None
    ma_danh_muc_cha: int | None = None

    class Config:
        from_attributes = True

models.Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
admin_dependency = Annotated[dict, Depends(require_admin)]


# get all products
@app.get("/products", response_model=list[SanPhamResponse])
async def get_all_products(db: db_dependency, _admin: admin_dependency):
    return db.query(SanPham).all()

# get all categories
@app.get("/products/categories", response_model=list[DanhMucResponse])
async def get_all_categories(db: db_dependency, _admin: admin_dependency):
    return db.query(DanhMuc).all()

# find product by category, name and status
@app.get("/products/find", response_model=list[SanPhamResponse])
def find_product(db: db_dependency, _admin: admin_dependency, product_name: str | None = None, product_status: str | None = None, product_category: int | None = None):
    query = db.query(SanPham)

    if product_name:
        query = query.filter(SanPham.ten_san_pham.ilike(f"%{product_name}%"))
    if product_status:
        query = query.filter(SanPham.trang_thai == product_status)
    if product_category:
        query = query.filter(SanPham.ma_danh_muc == product_category)

    products = query.all()
    if not products:
        raise HTTPException(status_code=404, detail="Khong tim thay san pham")

    return products

# get product by id
@app.get("/products/{id}")
async def get_product_by_id(id: int, db: db_dependency, _admin: admin_dependency):
    return db.query(SanPham).filter(SanPham.ma_san_pham == id).first()



# create product
@app.post("/products/create")
async def create_product(product: SanPhamRequest, db: db_dependency, _admin: admin_dependency):
    product_model = SanPham(**product.dict())
    db.add(product_model)
    db.commit()
    db.refresh(product_model)
    return product_model

# update product by id
@app.put("/products/update/{id}")
async def update_product(id: int, db: db_dependency, update_product: SanPhamRequest, _admin: admin_dependency):
    product = db.query(SanPham).filter(SanPham.ma_san_pham == id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"khong tim thay san pham co id:{id}")

    product.ten_san_pham = update_product.ten_san_pham
    product.gia_goc = update_product.gia_goc
    product.gia_khuyen_mai = update_product.gia_khuyen_mai
    product.mo_ta = update_product.mo_ta
    product.hinh_anh_dai_dien = update_product.hinh_anh_dai_dien
    product.ma_danh_muc = update_product.ma_danh_muc
    product.trang_thai = update_product.trang_thai

    db.add(product)
    db.commit()
    db.refresh(product)
    return "Cap nhat san pham thanh cong"

# delte product by id
@app.delete("/products/delete/{id}")
async def delete_product(id: int, db: db_dependency, _admin: admin_dependency):
    product = db.query(SanPham).filter(SanPham.ma_san_pham == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="fkhong tim thay san pham co id:{id}")

    variants = db.query(BienTheSanPham).filter(BienTheSanPham.ma_san_pham == id).all()
    if variants:
        raise HTTPException(status_code=400, detail="San pham khong the xoa do con bien the san pham. Vui long xoa cac bien the truoc.")

    db.delete(product)
    db.commit()

    return "Xoa thanh cong"

# create variants of product
@app.post("/products/variant/create")
async def create_variant_of_product(variant: BienTheSanPhamRequest, db: db_dependency, _admin: admin_dependency):
    variant_model = BienTheSanPham(**variant.dict())
    db.add(variant_model)
    db.commit()
    db.refresh(variant_model)
    return variant_model

# update varirant
@app.put("/products/variant/update/{id}")
async def update_variant(id: int, update_variant: BienTheSanPhamRequest, db: db_dependency, _admin: admin_dependency):
    variant_model = db.query(BienTheSanPham).filter(BienTheSanPham.ma_bien_the == id).first()
    if not variant_model:
        raise HTTPException(status_code=404, detail="Khong tim thay bien the")

    variant_model.kich_co = update_variant.kich_co
    variant_model.mau_sac = update_variant.mau_sac
    variant_model.so_luong_kho = update_variant.so_luong_kho
    variant_model.hinh_anh_bien_the = update_variant.hinh_anh_bien_the

    db.add(variant_model)
    db.commit()
    db.refresh(variant_model)
    return "Cap nhat bien the san pham thanh cong"

# delete variant
@app.delete("/products/variant/delete/{id}")
async def delete_variant(id: int, db: db_dependency, _admin: admin_dependency):
    variant_model = db.query(BienTheSanPham).filter(BienTheSanPham.ma_bien_the == id).first()
    if not variant_model:
        raise HTTPException(status_code=404, detail="Khong tim thay bien the")
    db.delete(variant_model)
    db.commit()
    return "Da xoa bien the san pham thanh cong"

# create categories
@app.post("/products/categories/create")
async def create_category(db: db_dependency, danhmuc: DanhMucRequest, _admin: admin_dependency):
    danhmuc_model = DanhMuc(**danhmuc.dict())
    db.add(danhmuc_model)
    db.commit()
    db.refresh(danhmuc_model)
    return danhmuc_model

# update category
@app.put("/products/categories/update/{id}")
async def update_category(id: int, db: db_dependency, update_category: DanhMucRequest, _admin: admin_dependency):
    danhmuc_model = db.query(DanhMuc).filter(DanhMuc.ma_danh_muc == id).first()
    if not danhmuc_model:
        raise HTTPException(status_code=404, detail="Khong tim thay danh muc")


    danhmuc_model.ten_danh_muc = update_category.ten_danh_muc
    danhmuc_model.mo_ta = update_category.mo_ta
    danhmuc_model.ma_danh_muc_cha = update_category.ma_danh_muc_cha

    db.add(danhmuc_model)
    db.commit()
    db.refresh(danhmuc_model)

    return "Da cap nhat danh muc san pham thanh cong"

# delete category
@app.delete("/products/categories/delete/{id}")
async def delete_category(id: int, db: db_dependency, _admin: admin_dependency):
    danhmuc_model = db.query(DanhMuc).filter(DanhMuc.ma_danh_muc == id).first()
    if not danhmuc_model:
        raise HTTPException(status_code=404, detail="Khong tim thay danh muc")

    products = db.query(SanPham).filter(SanPham.ma_danh_muc == id).all()
    if products:
        raise HTTPException(status_code=400, detail="Khong the xoa danh muc do con san pham thuoc danh muc, vui long xoa cac san pham thuoc danh muc truoc")

    db.delete(danhmuc_model)
    db.commit()

    return "Xoa danh muc san pham thanh cong"