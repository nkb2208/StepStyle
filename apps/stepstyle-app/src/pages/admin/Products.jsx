import React, { useEffect, useState } from 'react';
import { formatPrice, PRODUCTS } from '../../data';

export default function Products() {

  
  // Add Product form state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  let [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category_id: '',
    image: '',
    original_price: '',
    status: 'ACTIVE',
    description: '',
  });
  const [variants, setVariants] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expandedProductId, setExpandedProductId] = useState(null);

  const toggleRow = (id) => {
    setExpandedProductId(prev => (prev === id ? null : id));
  };

  const handleSaveNewCategory = () => {
    console.log("Đã lưu: ", newCategoryName);
    setIsAddingCategory(false);
  };


  const handleAddVariant = () => {

  };

  const handleRemoveVariant = () => {
  };

  const handleVariantChange = () => {

  };

  // Lấy danh sách sản phẩm
  useEffect(()=> {
    getAllProducts();
  }, []);

  const getAllProducts = async () =>{
    try {
      const response = await fetch("http://localhost:8001/products");
      if(!response){
        console.error("Loi sever");
      }
      const data = await response.json()

      setProducts(data);

    } catch (error) {
      console.error("Khong the lay du lieu", error);
    }
  }

  // Tạo sản phẩm mới
  const handleSubmit = () => {
    const rawPrice = newProduct?.original_price
      ? Number(String(newProduct.original_price).replace(/\./g, ''))
      : 0;

    const payload = {
      name: newProduct?.name || '',
      category_id: newProduct?.category_id || '',
      image: newProduct?.image || '',
      original_price: rawPrice,
      status: newProduct?.status || 'ACTIVE',
      description: newProduct?.description || '',
      variants: variants.map(v => ({
        size: v.size,
        color: v.color,
        stock: Number(v.stock) || 0,
      })),
    };

    console.log('Dữ liệu sản phẩm chuẩn bị gửi:', JSON.stringify(payload, null, 2));
    console.log('Object sản phẩm:', payload);
  };

  const handleCreateProduct = handleSubmit;

  const openEditModal = (product) => {
    setEditingProduct({
      ...product,
      original_price: product.original_price ? product.original_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
    });
    setShowEditProduct(true);
  };



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'original_price') {
      const numericValue = value.replace(/\D/g, '');
      const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      setNewProduct(prev => ({ ...prev, [name]: formattedValue }));
      return;
    }
    setNewProduct(prev => ({ ...prev, [name]: value }));
  };



  const [deletingProduct, setDeletingProduct] = useState(null);

  const confirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    const id = deletingProduct.id;
    setDeletingProduct(null);
    setProducts(prevProducts => prevProducts.filter(p => String(p.id) !== String(id)));
  };

  return (
    <div className="space-y-6 relative">
      {/* Modal Xác nhận xóa sản phẩm */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Xác nhận xóa sản phẩm</h3>
              <p className="text-sm text-slate-600">
                Bạn có muốn xóa sản phẩm <span className="font-bold text-slate-900">{}</span> này không?
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDeleteProduct}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Xóa sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form thêm sản phẩm */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-900 text-lg">Thêm sản phẩm mới</h3>
              <button onClick={() => setShowAddProduct(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên sản phẩm</label>
                    <input name="name" value={newProduct?.name || ''} onChange={handleInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="Nhập tên sản phẩm..." />
                  </div>
                  <div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Danh mục</label>
                      {!isAddingCategory ? (
                        <div className="flex items-center gap-2">
                          <select name="category_id" value={newProduct?.category_id || ''} onChange={handleInputChange} className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none bg-white">
                            <option value="">Không có</option>
                            <option value="1">Sneakers</option>
                            <option value="2">Phụ kiện</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setIsAddingCategory(true)}
                            className="shrink-0 bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors"
                          >
                            + Mới
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Nhập tên danh mục..."
                            className="w-full min-w-0 border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2.5 text-sm outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleSaveNewCategory}
                            className="shrink-0 bg-purple-500 hover:bg-purple-600 text-white rounded-xl px-3 py-2.5 text-xs font-bold transition-colors"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingCategory(false);
                              setNewCategoryName('');
                            }}
                            className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      )}
                    </div>
                    <div className='mt-4'>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Link Hình Ảnh</label>
                      <input name="image" value={newProduct?.image || ''} onChange={handleInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="https://..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Giá bán gốc (VNĐ)</label>
                      <input name="original_price" value={newProduct?.original_price || ''} onChange={handleInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="VD: 1.500.000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái</label>
                      <select name="status" value={newProduct?.status || 'ACTIVE'} onChange={handleInputChange} className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none bg-white">
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="INACTIVE">Ẩn</option>
                      </select>
                    </div>
                  </div>

                  <div className='w-full'>
                    <label className='block text-sm font-medium text-slate-700 mb-1.5' htmlFor="">Mô tả sản phẩm</label>
                    <div className='border border-slate-200 w-full rounded-xl p-2'>
                      <textarea name="description" value={newProduct?.description || ''} onChange={handleInputChange} className='w-full border-slate-200 focus:border-purple-500 rounded-xl text-sm outline-none bg-white' id=""/>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Phân loại hàng (Biến thể)</label>
                        <p className="text-xs text-slate-400">Thêm kích cỡ, màu sắc và số lượng tồn kho tương ứng</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddVariant}
                        className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                      >
                        + Thêm phân loại
                      </button>
                    </div>

                    {variants.length === 0 ? (
                      <div className="text-center py-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                        Chưa có phân loại nào.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-12 gap-2 px-1 text-xs font-medium text-slate-500">
                          <div className="col-span-4">Kích cỡ</div>
                          <div className="col-span-4">Màu sắc</div>
                          <div className="col-span-3">Số lượng kho</div>
                          <div className="col-span-1 text-center">Xóa</div>
                        </div>
                        {variants.map((variant, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={variant.size}
                                onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                                placeholder="VD: 39, 40"
                                className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none"
                              />
                            </div>
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={variant.color}
                                onChange={(e) => handleVariantChange(index, 'color', e.target.value)}
                                placeholder="VD: Đen, Trắng"
                                className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                                placeholder="0"
                                className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none"
                              />
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(index)}
                                title="Xóa biến thể"
                                className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Hình ảnh sản phẩm</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl h-100 flex flex-col items-center justify-center text-slate-400 text-sm cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden">
                    
                        {/* <img src="" alt="Preview" className="w-full h-full object-cover" /> */}
      
                        <>
                          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span className="font-medium text-slate-500">Xem trước</span>
                        </>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setShowAddProduct(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Hủy bỏ</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Đang lưu...' : 'Lưu sản phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Form sửa sản phẩm */}
      {showEditProduct && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-900 text-lg">Chỉnh sửa sản phẩm</h3>
              <button onClick={() => setShowEditProduct(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên sản phẩm</label>
                    <input name="name" value={editingProduct.name} onChange={handleEditInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="Nhập tên sản phẩm..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Danh mục</label>
                      <select name="category_id" value={editingProduct.category_id || ''} onChange={handleEditInputChange} className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none bg-white">
                        <option value="">Không có</option>
                        <option value="1">Sneakers</option>
                        <option value="2">Phụ kiện</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Link Hình Ảnh</label>
                      <input name="image" value={editingProduct.image || ''} onChange={handleEditInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="https://..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Giá bán gốc (VNĐ)</label>
                      <input name="original_price" value={editingProduct.original_price} onChange={handleEditInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="VD: 1.500.000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái</label>
                      <select name="status" value={editingProduct.status} onChange={handleEditInputChange} className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none bg-white">
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="INACTIVE">Ẩn</option>
                      </select>
                    </div>
                  </div>

                  <div className='w-full'>
                    <label className='block text-sm font-medium text-slate-700 mb-1.5' htmlFor="">Mô tả sản phẩm</label>
                    <div className='border border-slate-200 w-full rounded-xl p-2'>
                      <textarea value={editingProduct.description} onChange={handleInputChange} className='w-full border-slate-200 focus:border-purple-500 rounded-xl text-sm outline-none bg-white' name="" id=""/>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Hình ảnh sản phẩm</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl h-full min-h-[160px] flex flex-col items-center justify-center text-slate-400 text-sm cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden">
                    {editingProduct.image ? (
                        <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <>
                          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span className="font-medium text-slate-500">Xem trước</span>
                        </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setShowEditProduct(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Hủy bỏ</button>
              <button onClick={handleUpdateProduct} disabled={isSubmitting} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className='w-full flex items-center justify-end mb-3'>
        <button onClick={() => setShowAddProduct(true)} className="bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm shadow-purple-500/30 hover:bg-purple-600 transition-colors">
          + Thêm sản phẩm
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-900 text-lg">Danh sách sản phẩm ({products.length})</h3>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <input type="text" placeholder="Tìm kiếm sản phẩm..." className="border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm w-full md:w-64 outline-none" />
            <select className="border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm text-slate-600 outline-none bg-white">
              <option>Tất cả danh mục</option>
              <option>Sneakers</option>
              <option>Phụ kiện</option>
            </select>
            <select className="border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm text-slate-600 outline-none bg-white">
              <option>Trạng thái: Tất cả</option>
              <option>Còn hàng</option>
              <option>Hết hàng</option>
            </select>
          </div>
        </div>
        
        
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold rounded-tl-xl">Sản phẩm</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold">Danh mục</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold">Giá bán</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold">Tồn kho</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold">Nổi bật</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold rounded-tr-xl">Thao tác</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-slate-50">
            {products.length === 0 && <tr><td colSpan="6" className="text-center py-6 text-slate-400">Chưa có sản phẩm nào</td></tr>}
            
            {products.map(p => {
              const tongTonKho = p.danh_sach_bien_the?.reduce(
                (total, variant) => total + variant.so_luong_kho, 0
              ) || 0;
              const isExpanded = expandedProductId === p.ma_san_pham;

              return (
                <React.Fragment key={p.ma_san_pham}>
                  <tr
                    onClick={() => toggleRow(p.ma_san_pham)}
                    className={`cursor-pointer transition-colors ${isExpanded ? 'bg-purple-50/40' : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(p.ma_san_pham);
                          }}
                          title="Xem biến thể"
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0 ${
                            isExpanded
                              ? 'bg-purple-100 text-purple-600 rotate-90'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <div className="w-10 h-10 bg-slate-100 rounded-lg shrink-0 overflow-hidden">
                          {p.hinh_anh_dai_dien && <img src={p.hinh_anh_dai_dien} alt={p.ten_san_pham} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{p.ten_san_pham}</p>
                          <span className="text-xs text-purple-500 font-medium">
                            {isExpanded ? 'Thu gọn biến thể' : `Xem biến thể (${p.danh_sach_bien_the?.length || 0})`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{p.ma_danh_muc || '-'}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatPrice(p.gia_goc || 0)}</td>
                    
                    <td className="py-3 px-4">
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md">
                        {tongTonKho}
                      </span>
                    </td>
                    
                    <td className="py-3 px-4">
                      {p.trang_thai === 'ACTIVE' 
                        ? <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md">Hoạt động</span> 
                        : <span className="text-slate-600 font-bold bg-slate-100 px-2 py-1 rounded-md">Ẩn</span>
                      }
                    </td>
                    
                    <td className="py-3 px-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEditModal(p)} className="text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-emerald-100">Sửa</button>
                      <button onClick={() => handleDelete(p.ma_san_pham)} className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-red-100">Xóa</button>
                    </td>
                  </tr>

                  {expandedProductId === p.ma_san_pham && (
                    <tr className="bg-slate-50/40">
                      <td colSpan="6" className="px-6 py-3">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 shadow-inner transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Danh sách biến thể — {p.ten_san_pham}
                            </p>
                            <span className="text-xs text-slate-500 font-medium">
                              Tổng: {p.danh_sach_bien_the?.length || 0} phân loại
                            </span>
                          </div>

                          {!p.danh_sach_bien_the || p.danh_sach_bien_the.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2 text-center">
                              Sản phẩm này chưa có biến thể nào.
                            </p>
                          ) : (
                            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-100/80 text-slate-500 border-b border-slate-100">
                                  <tr>
                                    <th className="text-left py-2.5 px-4 font-semibold">Hình ảnh biến thể</th>
                                    <th className="text-left py-2.5 px-4 font-semibold">Kích cỡ</th>
                                    <th className="text-left py-2.5 px-4 font-semibold">Màu sắc</th>
                                    <th className="text-left py-2.5 px-4 font-semibold">Số lượng kho</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {p.danh_sach_bien_the.map((variant, idx) => {
                                    const variantImg = variant.hinh_anh_bien_the || variant.hinh_anh || p.hinh_anh_dai_dien;
                                    const size = variant.kich_co ?? variant.size ?? '-';
                                    const color = variant.mau_sac ?? variant.color ?? '-';
                                    const stock = variant.so_luong_kho ?? variant.stock ?? 0;

                                    return (
                                      <tr key={variant.ma_bien_the || idx} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-2.5 px-4">
                                          <div className="w-8 h-8 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                                            {variantImg ? (
                                              <img src={variantImg} alt={`${p.ten_san_pham} - ${color}`} className="w-full h-full object-cover" />
                                            ) : (
                                              <span className="text-[10px] text-slate-400">N/A</span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-4 font-bold text-slate-800">
                                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                                            Size {size}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4 font-medium text-slate-700">
                                          <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md font-semibold">
                                            {color}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4">
                                          <span
                                            className={`font-bold px-2.5 py-1 rounded-md ${
                                              stock > 0
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'bg-red-50 text-red-500'
                                            }`}
                                          >
                                            {stock > 0 ? `${stock} đôi` : 'Hết hàng (0)'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
      </div>
    </div>
  );
}
