import React, { useEffect, useState } from 'react';
import { formatPrice } from '../../data';
import {
  getProducts,
  findProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../services/adminProductService';

export default function Products() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);

  // Data states
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Form states
  const [newProduct, setNewProduct] = useState({
    name: '', category_id: '', image: '', original_price: '', status: 'ACTIVE', description: ''
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [editVariants, setEditVariants] = useState([]);
  const [showEditVariant, setShowEditVariant] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);

  const toggleRow = (id) => {
    setExpandedProductId(prev => (prev === id ? null : id));
  };


  const [searchName, setSearchName] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Lấy danh sách sản phẩm
  useEffect(() => {
    getAllProducts();
    getAllCategories();
  }, []);

  const getAllProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Không thể lấy dữ liệu", error);
    }
  };

  // Tìm kiếm & lọc sản phẩm
  const handleFindProducts = async (nameVal = searchName, categoryVal = filterCategory, statusVal = filterStatus) => {
    try {
      const params = {};
      if (nameVal && nameVal.trim()) params.product_name = nameVal.trim();
      if (categoryVal) params.product_category = categoryVal;
      if (statusVal) params.product_status = statusVal;

      if (Object.keys(params).length === 0) {
        getAllProducts();
        return;
      }

      const data = await findProducts(params);
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error.response?.status === 404) {
        setProducts([]);
        return;
      }
      console.error("Không thể tìm kiếm sản phẩm", error);
    }
  };

  // Tạo sản phẩm mới
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const numericPrice = parseFloat(newProduct.original_price.replace(/\./g, '')) || 0;
      const productPayload = {
        ten_san_pham: newProduct.name,
        gia_goc: numericPrice,
        gia_khuyen_mai: numericPrice,
        mo_ta: newProduct.description,
        hinh_anh_dai_dien: newProduct.image,
        ma_danh_muc: newProduct.category_id ? parseInt(newProduct.category_id) : null,
        trang_thai: newProduct.status
      };

      const createdProduct = await createProduct(productPayload);
      const createdProductId = createdProduct.ma_san_pham;

      if (variants && variants.length > 0) {
        const variantPromises = variants.map(variant => {
          const newVariant = {
            ma_san_pham: createdProductId,
            kich_co: variant.size,
            mau_sac: variant.color,
            so_luong_kho: parseInt(variant.stock) || 0,
            hinh_anh_bien_the: variant.image || newProduct.image
          };
          return createVariant(newVariant);
        });
        await Promise.all(variantPromises);
      }

      setShowAddProduct(false);
      setNewProduct({ name: '', category_id: '', image: '', original_price: '', status: 'ACTIVE', description: '' });
      setVariants([]);
      getAllProducts();
    } catch (error) {
      console.error("Không thể thêm sản phẩm ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gọi API lấy chi tiết sản phẩm & Đổ dữ liệu vào Form Sửa
  const openEditModal = async (product) => {
    try {
      const data = await getProductById(product.ma_san_pham);
      if (!data) {
        alert("Không thể tải thông tin sản phẩm!");
        return;
      }

      setEditingProduct({
        ma_san_pham: data.ma_san_pham,
        name: data.ten_san_pham || '',
        category_id: data.ma_danh_muc ? data.ma_danh_muc.toString() : '',
        image: data.hinh_anh_dai_dien || '',
        original_price: data.gia_goc ? data.gia_goc.toString() : '',
        status: data.trang_thai || 'ACTIVE',
        description: data.mo_ta || ''
      });

      const sourceVariants = data.danh_sach_bien_the || product.danh_sach_bien_the || [];
      setEditVariants(
        sourceVariants.map(v => ({
          ma_bien_the: v.ma_bien_the,
          size: v.kich_co ?? v.size ?? '',
          color: v.mau_sac ?? v.color ?? '',
          stock: v.so_luong_kho ?? v.stock ?? 0,
          image: v.hinh_anh_bien_the ?? v.image ?? ''
        }))
      );

      setShowEditProduct(true);
    } catch (error) {
      console.error("Lỗi khi tải chi tiết sản phẩm: ", error);
      alert("Không thể tải thông tin sản phẩm!");
    }
  };

  // Cập nhật sản phẩm
  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    setIsSubmitting(true);
    try {
      const numericPrice = parseFloat(editingProduct.original_price) || 0;
      const updatePayload = {
        ten_san_pham: editingProduct.name,
        gia_goc: numericPrice,
        gia_khuyen_mai: numericPrice,
        mo_ta: editingProduct.description,
        hinh_anh_dai_dien: editingProduct.image,
        ma_danh_muc: editingProduct.category_id ? parseInt(editingProduct.category_id) : null,
        trang_thai: editingProduct.status
      };

      await updateProduct(editingProduct.ma_san_pham, updatePayload);

      if (editVariants && editVariants.length > 0) {
        const variantPromises = editVariants.map(variant => {
          const variantPayload = {
            ma_san_pham: editingProduct.ma_san_pham,
            kich_co: variant.size.toString(),
            mau_sac: variant.color,
            so_luong_kho: parseInt(variant.stock) || 0,
            hinh_anh_bien_the: variant.image || editingProduct.image || ''
          };

          if (variant.ma_bien_the) {
            return updateVariant(variant.ma_bien_the, variantPayload);
          } else {
            return createVariant(variantPayload);
          }
        });
        await Promise.all(variantPromises);
      }

      setShowEditProduct(false);
      setEditingProduct(null);
      getAllProducts();
    } catch (error) {
      console.error("Khong the cap nhat san pham", error);
      alert("Cập nhật sản phẩm thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa sản phẩm
  const confirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      await deleteProduct(deletingProduct.ma_san_pham);
      setDeletingProduct(null);
      getAllProducts();
    } catch (error) {
      console.error("Khong the xoa san pham", error);
      alert("Không thể xóa sản phẩm này (kiểm tra lại biến thể liên quan)!");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'original_price') {
      const numericValue = value;
      const formattedValue = numericValue;
      setNewProduct(prev => ({ ...prev, [name]: formattedValue }));
      return;
    }
    setNewProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'original_price') {
      const numericValue = value;
      const formattedValue = numericValue;
      setEditingProduct(prev => ({ ...prev, [name]: formattedValue }));
      return;
    }
    setEditingProduct(prev => ({ ...prev, [name]: value }));
  };

  //Xử lý biến thể 
  const handleAddVariant = () => {
    setVariants([...variants, { size: '', color: '', stock: 0, image: '' }]);
  };

  const handleRemoveVariant = async (id) => {
    try {
      await deleteVariant(id);
      console.log("Xoa bien the thanh cong");
      getAllProducts();
    } catch (error) {
      console.error("Khong the xoa bien the", error);
    }
  };

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const handleAddEditVariant = () => {
    setEditVariants([...editVariants, { size: '', color: '', stock: 0, image: '' }]);
  };

  const handleEditVariantChange = (index, field, value) => {
    const updated = [...editVariants];
    updated[index] = { ...updated[index], [field]: value };
    setEditVariants(updated);
  };

  const openEditVariantModal = (variant, productId) => {
    setEditingVariant({
      ma_bien_the: variant.ma_bien_the,
      ma_san_pham: variant.ma_san_pham ?? productId,
      size: variant.kich_co ?? variant.size ?? '',
      color: variant.mau_sac ?? variant.color ?? '',
      stock: variant.so_luong_kho ?? variant.stock ?? 0,
      image: variant.hinh_anh_bien_the ?? variant.image ?? ''
    });
    setShowEditVariant(true);
  };

  const handleUpdateVariant = async () => {
    if (!editingVariant) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ma_san_pham: editingVariant.ma_san_pham,
        kich_co: editingVariant.size.toString(),
        mau_sac: editingVariant.color,
        so_luong_kho: parseInt(editingVariant.stock) || 0,
        hinh_anh_bien_the: editingVariant.image || ''
      };

      await updateVariant(editingVariant.ma_bien_the, payload);

      setShowEditVariant(false);
      setEditingVariant(null);
      getAllProducts();
    } catch (error) {
      console.error("Không thể cập nhật biến thể", error);
      alert("Cập nhật biến thể thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryParentId, setCategoryParentId] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const getAllCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      const category = {
        ten_danh_muc: categoryName.trim(),
        mo_ta: categoryDesc || null,
        ma_danh_muc_cha: categoryParentId ? parseInt(categoryParentId) : null
      };

      await createCategory(category);

      setCategoryName('');
      setCategoryDesc('');
      setCategoryParentId('');
      getAllCategories();
    } catch (error) {
      console.error(error);
    }
  };

  const openEditCategory = (cat) => {
    setEditingCategoryId(cat.ma_danh_muc);
    setCategoryName(cat.ten_danh_muc || '');
    setCategoryDesc(cat.mo_ta || '');
    setCategoryParentId(cat.ma_danh_muc_cha ? cat.ma_danh_muc_cha.toString() : '');
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setCategoryName('');
    setCategoryDesc('');
    setCategoryParentId('');
  };

  const handleUpdateCategory = async () => {
    if (!editingCategoryId || !categoryName.trim()) return;
    try {
      const category = {
        ten_danh_muc: categoryName.trim(),
        mo_ta: categoryDesc || null,
        ma_danh_muc_cha: categoryParentId ? parseInt(categoryParentId) : null
      };

      await updateCategory(editingCategoryId, category);

      cancelEditCategory();
      getAllCategories();
    } catch (error) {
      console.error(error);
      alert("Cập nhật danh mục thất bại!");
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteCategory(id);
      if (editingCategoryId === id) {
        cancelEditCategory();
      }
      getAllCategories();
    } catch (error) {
      console.error(error);
      alert("Không thể xóa danh mục do còn sản phẩm thuộc danh mục này!");
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Modal Xác nhận xóa sản phẩm */}
      {deletingProduct && (
        <div className="fixed min-h-screen inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Xác nhận xóa sản phẩm</h3>
              <p className="text-sm text-slate-600">
                Bạn có muốn xóa sản phẩm <span className="font-bold text-slate-900">{deletingProduct.ten_san_pham}</span> này không?
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
        <div className="fixed inset-0 min-h-screen bg-slate-900/50 z-50 flex items-center justify-center p-4">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Danh mục</label>
                      <select name="category_id" value={newProduct?.category_id || ''} onChange={handleInputChange} className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none bg-white">
                        <option value="">Không có</option>
                        {categories.map(cat => (
                          <option key={cat.ma_danh_muc} value={cat.ma_danh_muc}>{cat.ten_danh_muc}</option>
                        ))}
                      </select>
                    </div>
                    <div>
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
                    <label className='block text-sm font-medium text-slate-700 mb-1.5'>Mô tả sản phẩm</label>
                    <div className='border border-slate-200 w-full rounded-xl p-2'>
                      <textarea name="description" value={newProduct?.description || ''} onChange={handleInputChange} className='w-full border-slate-200 focus:border-purple-500 rounded-xl text-sm outline-none bg-white' />
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
                          <div className="col-span-2">Kích cỡ</div>
                          <div className="col-span-3">Màu sắc</div>
                          <div className="col-span-2">Số lượng kho</div>
                          <div className="col-span-4">Hình ảnh biến thể</div>
                          <div className="col-span-1 text-center">Xóa</div>
                        </div>
                        {variants.map((variant, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={variant.size}
                                onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                                placeholder="VD: 39, 40"
                                className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="text"
                                value={variant.color}
                                onChange={(e) => handleVariantChange(index, 'color', e.target.value)}
                                placeholder="VD: Đen, Trắng"
                                className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                                placeholder="0"
                                className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none"
                              />
                            </div>
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={variant.image || ''}
                                onChange={(e) => handleVariantChange(index, 'image', e.target.value)}
                                placeholder="https://..."
                                className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none"
                              />
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <button
                                type="button"
                                onClick={() => setVariants(variants.filter((_, i) => i !== index))}
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
                    {newProduct?.image ? (
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
              <button onClick={handleSubmit} disabled={isSubmitting} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Đang lưu...' : 'Lưu sản phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Sửa sản phẩm */}
      {showEditProduct && editingProduct && (
        <div className="fixed inset-0 min-h-screen bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-900 text-lg">Chỉnh sửa sản phẩm</h3>
              <button onClick={() => setShowEditProduct(false)} className="cursor-pointer text-slate-400 hover:text-slate-600">
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
                      <select name="category_id" value={editingProduct.category_id} onChange={handleEditInputChange} className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none bg-white">
                        <option value="">Không có</option>
                        {categories.map(cat => (
                          <option key={cat.ma_danh_muc} value={cat.ma_danh_muc}>{cat.ten_danh_muc}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Link Hình Ảnh</label>
                      <input name="image" value={editingProduct.image} onChange={handleEditInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="https://..." />
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
                    <label className='block text-sm font-medium text-slate-700 mb-1.5'>Mô tả sản phẩm</label>
                    <div className='border border-slate-200 w-full rounded-xl p-2'>
                      <textarea name="description" value={editingProduct.description} onChange={handleEditInputChange} className='w-full border-slate-200 focus:border-purple-500 rounded-xl text-sm outline-none bg-white' />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Phân loại hàng (Biến thể)</label>
                        <p className="text-xs text-slate-400">Chỉnh sửa hoặc thêm kích cỡ, màu sắc, tồn kho và hình ảnh biến thể</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEditVariant}
                        className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                      >
                        + Thêm phân loại
                      </button>
                    </div>

                    {editVariants.length === 0 ? (
                      <div className="text-center py-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                        Chưa có phân loại nào.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-12 gap-2 px-1 text-xs font-medium text-slate-500">
                          <div className="col-span-2">Kích cỡ</div>
                          <div className="col-span-3">Màu sắc</div>
                          <div className="col-span-2">Số lượng kho</div>
                          <div className="col-span-4">Hình ảnh biến thể</div>
                          <div className="col-span-1 text-center">Xóa</div>
                        </div>
                        {editVariants.map((variant, index) => (
                          <div key={variant.ma_bien_the || index} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={variant.size}
                                onChange={(e) => handleEditVariantChange(index, 'size', e.target.value)}
                                placeholder="VD: 39, 40"
                                className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="text"
                                value={variant.color}
                                onChange={(e) => handleEditVariantChange(index, 'color', e.target.value)}
                                placeholder="VD: Đen, Trắng"
                                className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(e) => handleEditVariantChange(index, 'stock', e.target.value)}
                                placeholder="0"
                                className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none"
                              />
                            </div>
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={variant.image || ''}
                                onChange={(e) => handleEditVariantChange(index, 'image', e.target.value)}
                                placeholder="https://..."
                                className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none"
                              />
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <button
                                type="button"
                                onClick={() => setEditVariants(editVariants.filter((_, i) => i !== index))}
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

      {/* Modal Form Sửa biến thể riêng lẻ */}
      {showEditVariant && editingVariant && (
        <div className="fixed min-h-screen inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <h3 className="font-bold text-slate-900 text-lg">Chỉnh sửa biến thể</h3>
              <button onClick={() => setShowEditVariant(false)} className="cursor-pointer text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1 md:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Kích cỡ</label>
                    <input
                      type="text"
                      value={editingVariant.size}
                      onChange={(e) => setEditingVariant(prev => ({ ...prev, size: e.target.value }))}
                      placeholder="VD: 39, 40"
                      className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Màu sắc</label>
                    <input
                      type="text"
                      value={editingVariant.color}
                      onChange={(e) => setEditingVariant(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="VD: Đen, Trắng"
                      className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Số lượng kho</label>
                  <input
                    type="number"
                    min="0"
                    value={editingVariant.stock}
                    onChange={(e) => setEditingVariant(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="0"
                    className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Hình ảnh biến thể</label>
                  <input
                    type="text"
                    value={editingVariant.image || ''}
                    onChange={(e) => setEditingVariant(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Xem trước ảnh</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl h-44 flex flex-col items-center justify-center text-slate-400 text-sm overflow-hidden">
                  {editingVariant.image ? (
                    <img src={editingVariant.image} alt="Variant Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="font-medium text-slate-500 text-xs">Xem trước</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setShowEditVariant(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Hủy bỏ</button>
              <button onClick={handleUpdateVariant} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors">
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quản lý danh mục */}
      {showCategoryModal && (
        <div className="fixed min-h-screen inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-900 text-lg">Quản lý danh mục</h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  cancelEditCategory();
                }}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Form Thêm / Sửa danh mục */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">
                  {editingCategoryId ? `Chỉnh sửa danh mục #${editingCategoryId}` : 'Thêm danh mục mới'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tên danh mục</label>
                    <input
                      type="text"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="Nhập tên danh mục..."
                      className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Danh mục cha</label>
                    <select
                      value={categoryParentId}
                      onChange={(e) => setCategoryParentId(e.target.value)}
                      className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                    >
                      <option value="">Không có (Danh mục gốc)</option>
                      {categories
                        .filter(c => c.ma_danh_muc !== editingCategoryId)
                        .map(cat => (
                          <option key={cat.ma_danh_muc} value={cat.ma_danh_muc}>{cat.ten_danh_muc}</option>
                        ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Mô tả</label>
                  <input
                    type="text"
                    value={categoryDesc}
                    onChange={(e) => setCategoryDesc(e.target.value)}
                    placeholder="Nhập mô tả danh mục..."
                    className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={cancelEditCategory}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 transition-colors"
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={editingCategoryId ? handleUpdateCategory : handleCreateCategory}
                    className="bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-600 transition-colors"
                  >
                    {editingCategoryId ? 'Cập nhật danh mục' : '+ Thêm danh mục'}
                  </button>
                </div>
              </div>

              {/* Danh sách danh mục */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-3">Danh sách danh mục ({categories.length})</h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left py-2.5 px-4 text-slate-500 font-semibold">ID</th>
                        <th className="text-left py-2.5 px-4 text-slate-500 font-semibold">Tên danh mục</th>
                        <th className="text-left py-2.5 px-4 text-slate-500 font-semibold">Mô tả</th>
                        <th className="text-left py-2.5 px-4 text-slate-500 font-semibold">Danh mục cha</th>
                        <th className="text-center py-2.5 px-4 text-slate-500 font-semibold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {categories.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-slate-400 text-xs">Chưa có danh mục nào</td>
                        </tr>
                      ) : (
                        categories.map(cat => {
                          const parentCat = categories.find(c => c.ma_danh_muc === cat.ma_danh_muc_cha);
                          return (
                            <tr key={cat.ma_danh_muc} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 text-slate-500 font-medium">#{cat.ma_danh_muc}</td>
                              <td className="py-2.5 px-4 font-bold text-slate-900">{cat.ten_danh_muc}</td>
                              <td className="py-2.5 px-4 text-slate-600">{cat.mo_ta || '-'}</td>
                              <td className="py-2.5 px-4 text-slate-600">{parentCat ? parentCat.ten_danh_muc : '-'}</td>
                              <td className="py-2.5 px-4 flex justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditCategory(cat)}
                                  className="text-emerald-500 bg-emerald-50 px-3 py-1 rounded-lg font-bold text-xs hover:bg-emerald-100 transition-colors"
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.ma_danh_muc)}
                                  className="text-red-500 bg-red-50 px-3 py-1 rounded-lg font-bold text-xs hover:bg-red-100 transition-colors"
                                >
                                  Xóa
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className='w-full flex items-center justify-end gap-3 mb-3'>
        <button onClick={() => setShowCategoryModal(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
          Quản lý danh mục
        </button>
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
            <input
              type="text"
              value={searchName}
              onChange={(e) => {
                const val = e.target.value;
                setSearchName(val);
                handleFindProducts(val, filterCategory, filterStatus);
              }}
              placeholder="Tìm kiếm sản phẩm..."
              className="border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm w-full md:w-64 outline-none"
            />
            <select
              value={filterCategory}
              onChange={(e) => {
                const val = e.target.value;
                setFilterCategory(val);
                handleFindProducts(searchName, val, filterStatus);
              }}
              className="border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm text-slate-600 outline-none bg-white"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map(cat => (
                <option key={cat.ma_danh_muc} value={cat.ma_danh_muc}>{cat.ten_danh_muc}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                const val = e.target.value;
                setFilterStatus(val);
                handleFindProducts(searchName, filterCategory, val);
              }}
              className="border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm text-slate-600 outline-none bg-white"
            >
              <option value="">Trạng thái: Tất cả</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Ẩn</option>
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
              <th className="text-left py-3 px-4 text-slate-500 font-semibold">Trạng thái</th>
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
                          <img src={p.hinh_anh_dai_dien} alt={p.ten_san_pham} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{p.ten_san_pham}</p>
                          <span className="text-xs text-purple-500 font-medium">
                            {isExpanded ? 'Thu gọn biến thể' : `Xem biến thể (${p.danh_sach_bien_the?.length || 0})`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {categories.find(c => c.ma_danh_muc === p.ma_danh_muc)?.ten_danh_muc || p.ma_danh_muc || '-'}
                    </td>
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
                      <button onClick={() => openEditModal(p)} className="text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-emerald-100 transition-colors">Sửa</button>
                      <button onClick={() => setDeletingProduct(p)} className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-red-100 transition-colors">Xóa</button>
                    </td>
                  </tr>

                  {/* Biến thể của sản phẩm */}
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
                                    <th>Thao tác</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {p.danh_sach_bien_the.map((variant, idx) => {
                                    const variantImg = variant.hinh_anh_bien_the;
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

                                        <td className="flex items-center justify-center py-2.5 px-4 gap-2">
                                          <button type="button" onClick={() => openEditVariantModal(variant, p.ma_san_pham)} className="text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-emerald-100 transition-colors">
                                            Sửa
                                          </button>
                                          <button type="button" onClick={() => handleRemoveVariant(variant.ma_bien_the)} className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-red-100 transition-colors">
                                            Xóa
                                          </button>
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