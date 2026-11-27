import axios from 'axios';

const PUBLIC_PRODUCT_API_URL =
  import.meta.env.VITE_PRODUCT_API_URL || 'http://localhost:4008';

const publicProductClient = axios.create({
  baseURL: PUBLIC_PRODUCT_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format';

export const getEffectivePrice = (product) => {
  const promo = Number(product?.gia_khuyen_mai || 0);
  const orig = Number(product?.gia_goc || 0);
  return promo > 0 && (orig === 0 || promo < orig) ? promo : orig;
};

export const getDefaultVariant = (product) => {
  const variants = product?.danh_sach_bien_the || [];
  return variants.find((v) => Number(v.so_luong_kho) > 0) || variants[0] || null;
};

export const getPublicProducts = async (params = {}) => {
  const response = await publicProductClient.get('/public/products', { params });
  return Array.isArray(response.data) ? response.data : [];
};

export const getPublicProductById = async (id) => {
  const response = await publicProductClient.get(`/public/products/${id}`);
  return response.data;
};

export const getPublicCategories = async () => {
  const response = await publicProductClient.get('/public/categories');
  return Array.isArray(response.data) ? response.data : [];
};

export default {
  getPublicProducts,
  getPublicProductById,
  getPublicCategories,
};
