import React, { useState } from 'react';
import { PRODUCTS, formatPrice } from '../../data';

export default function Products() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  return (
    <div className="space-y-6 relative">
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
                    <input type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="Nhập tên sản phẩm..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Danh mục</label>
                      <select className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none bg-white">
                        <option>Sneakers</option>
                        <option>Phụ kiện</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Thương hiệu</label>
                      <select className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none bg-white">
                        <option>Nike</option>
                        <option>Adidas</option>
                        <option>Vans</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Giá bán (VNĐ)</label>
                      <input type="number" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="VD: 1500000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Số lượng tồn kho</label>
                      <input type="number" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="Số lượng" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Hình ảnh sản phẩm</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl h-full min-h-[160px] flex flex-col items-center justify-center text-slate-400 text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="font-medium text-slate-500">Tải ảnh lên</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setShowAddProduct(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Hủy bỏ</button>
              <button onClick={() => setShowAddProduct(false)} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors">Lưu sản phẩm</button>
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
            <h3 className="font-bold text-slate-900 text-lg">Danh sách sản phẩm ({PRODUCTS.length})</h3>
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
            {PRODUCTS.slice(0, 5).map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg shrink-0"></div>
                    <div>
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.brand}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-600 font-medium">{p.category}</td>
                <td className="py-3 px-4 font-bold text-slate-900">{formatPrice(p.price)}</td>
                <td className="py-3 px-4"><span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md">{p.stock} sp</span></td>
                <td className="py-3 px-4">{p.featured ? <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-md">★ Có</span> : ''}</td>
                <td className="py-3 px-4 flex gap-2">
                  <button className="text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-emerald-100">Sửa</button>
                  <button className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-red-100">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
