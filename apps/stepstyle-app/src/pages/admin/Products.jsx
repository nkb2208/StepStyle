import React, { useState } from 'react';
import { formatPrice, PRODUCTS } from '../../data';

export default function Products() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [products, setProducts] = useState(
    PRODUCTS.map(p => ({
      ...p,
      original_price: p.original_price ?? p.price ?? 0,
      category_name: p.category_name ?? p.category ?? '-',
      status: p.status ?? (p.featured ? 'ACTIVE' : 'INACTIVE')
    }))
  );
  const [loading] = useState(false);
  const [error] = useState(null);
  
  // Add Product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    original_price: '',
    status: 'ACTIVE',
    category_id: null,
    image: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const openEditModal = (product) => {
    setEditingProduct({
      ...product,
      original_price: product.original_price ? product.original_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
    });
    setShowEditProduct(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'original_price') {
      const numericValue = value.replace(/\D/g, '');
      const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      setEditingProduct(prev => ({ ...prev, [name]: formattedValue }));
      return;
    }
    setEditingProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct.name || !editingProduct.original_price) {
      alert("Vui lòng nhập tên và giá sản phẩm");
      return;
    }
    setIsSubmitting(true);
    const updatedPrice = parseInt(String(editingProduct.original_price).replace(/\D/g, ''), 10) || 0;
    setProducts(prev =>
      prev.map(p =>
        String(p.id) === String(editingProduct.id)
          ? {
              ...p,
              name: editingProduct.name,
              original_price: updatedPrice,
              price: updatedPrice,
              status: editingProduct.status,
              description: editingProduct.description,
              image: editingProduct.image,
              category_id: editingProduct.category_id || null
            }
          : p
      )
    );
    setShowEditProduct(false);
    setEditingProduct(null);
    setIsSubmitting(false);
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

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.original_price) {
      alert("Vui lòng nhập tên và giá sản phẩm");
      return;
    }
    setIsSubmitting(true);
    const priceValue = parseInt(newProduct.original_price.replace(/\D/g, ''), 10) || 0;
    const createdItem = {
      id: String(Date.now()),
      name: newProduct.name,
      original_price: priceValue,
      price: priceValue,
      status: newProduct.status,
      description: newProduct.description,
      image: newProduct.image,
      category_id: newProduct.category_id || null,
      stock: 0
    };
    setProducts(prev => [createdItem, ...prev]);

    setNewProduct({
      name: '',
      original_price: '',
      status: 'ACTIVE',
      category_id: null,
      image: '',
      description: ''
    });
    setShowAddProduct(false);
    setIsSubmitting(false);
  };

  const [deletingProduct, setDeletingProduct] = useState(null);

  const handleDelete = (productOrId) => {
    if (typeof productOrId === 'object' && productOrId !== null) {
      setDeletingProduct(productOrId);
    } else {
      const found = products.find(p => String(p.id) === String(productOrId));
      setDeletingProduct(found || { id: productOrId, name: `Sản phẩm #${productOrId}` });
    }
  };

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
                Bạn có muốn xóa sản phẩm <span className="font-bold text-slate-900">{deletingProduct.name || deletingProduct.title || ''}</span> này không?
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
                    <input name="name" value={newProduct.name} onChange={handleInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="Nhập tên sản phẩm..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Danh mục</label>
                      <select className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none bg-white">
                        <option value="">Không có</option>
                        <option value="1">Sneakers</option>
                        <option value="2">Phụ kiện</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Link Hình Ảnh</label>
                      <input name="image" value={newProduct.image} onChange={handleInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="https://..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Giá bán gốc (VNĐ)</label>
                      <input name="original_price" value={newProduct.original_price} onChange={handleInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="VD: 1.500.000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái</label>
                      <select name="status" value={newProduct.status} onChange={handleInputChange} className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none bg-white">
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="INACTIVE">Ẩn</option>
                      </select>
                    </div>
                  </div>

                  <div className='w-full'>
                    <label className='block text-sm font-medium text-slate-700 mb-1.5' htmlFor="">Mô tả sản phẩm</label>
                    <div className='border border-slate-200 w-full rounded-xl p-2'>
                      <textarea value={newProduct.description} onChange={handleInputChange} className='w-full border-slate-200 focus:border-purple-500 rounded-xl text-sm outline-none bg-white' name="" id=""/>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Hình ảnh sản phẩm</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl h-full min-h-[160px] flex flex-col items-center justify-center text-slate-400 text-sm cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden">
                    {newProduct.image ? (
                        <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
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
              <button onClick={() => setShowAddProduct(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Hủy bỏ</button>
              <button onClick={handleCreateProduct} disabled={isSubmitting} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors disabled:opacity-50">
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
        
        {loading ? (
          <div className="text-center py-10 text-slate-500 animate-pulse">Đang tải sản phẩm...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : (
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
              {products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg shrink-0 overflow-hidden">
                        {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{p.name || p.title}</p>
                        <p className="text-xs text-slate-400">{p.brand || 'No brand'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{p.category_name || p.category_id || '-'}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{formatPrice(p.original_price || p.price || 0)}</td>
                  <td className="py-3 px-4"><span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md">{p.variant_count ?? p.stock ?? 0}</span></td>
                  <td className="py-3 px-4">{p.status === 'ACTIVE' ? <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md">Hoạt động</span> : <span className="text-slate-600 font-bold bg-slate-100 px-2 py-1 rounded-md">Ẩn</span>}</td>
                  <td className="py-3 px-4 flex gap-2">
                    <button onClick={() => openEditModal(p)} className="text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-emerald-100">Sửa</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-red-100">Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
