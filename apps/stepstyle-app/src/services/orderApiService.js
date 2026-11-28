import axios from 'axios';
import { refreshToken as requestRefreshToken } from './authService';

const orderApiClient = axios.create({
  baseURL: import.meta.env.VITE_ORDER_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

orderApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshPromise = null;

orderApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalConfig = error.config;
    if (error.response?.status === 401 && originalConfig && !originalConfig._retry) {
      const storedRefresh = localStorage.getItem('refreshToken');
      if (storedRefresh) {
        originalConfig._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = requestRefreshToken().finally(() => {
              refreshPromise = null;
            });
          }
          const refreshed = await refreshPromise;
          if (refreshed?.accessToken) {
            localStorage.setItem('token', refreshed.accessToken);
            if (refreshed.refreshToken) {
              localStorage.setItem('refreshToken', refreshed.refreshToken);
            }
            originalConfig.headers = originalConfig.headers || {};
            originalConfig.headers.Authorization = `Bearer ${refreshed.accessToken}`;
            return orderApiClient(originalConfig);
          }
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      }
    }
    return Promise.reject(error);
  }
);

export const addToCart = async (userId, productId, variantId, quantity, price) => {
  const payload = {
    ma_san_pham: productId,
    ma_bien_the: variantId,
    so_luong: quantity,
    gia: price,
  };
  if (userId !== null && userId !== undefined && userId !== '') {
    payload.ma_nguoi_dung = userId;
  }
  const response = await orderApiClient.post('/cart/add', payload);
  return response.data;
};

export const getMyCart = async () => {
  const response = await orderApiClient.get('/cart/me');
  return response.data;
};

export const getCart = async (userId) => {
  if (userId === null || userId === undefined || userId === '') {
    return getMyCart();
  }
  const response = await orderApiClient.get(`/cart/${userId}`);
  return response.data;
};

export const updateCartItem = async (userId, variantId, quantity, extra = {}) => {
  const payload = {
    ma_bien_the: variantId,
    so_luong: quantity,
    ...extra,
  };
  if (userId !== null && userId !== undefined && userId !== '') {
    payload.ma_nguoi_dung = userId;
  }
  const response = await orderApiClient.put('/cart/update', payload);
  return response.data;
};

export const removeCartItem = async (userId, variantId) => {
  const data = { ma_bien_the: variantId };
  if (userId !== null && userId !== undefined && userId !== '') {
    data.ma_nguoi_dung = userId;
  }
  const response = await orderApiClient.delete('/cart/remove', { data });
  return response.data;
};

export const checkout = async (checkoutData) => {
  const response = await orderApiClient.post('/orders/checkout', checkoutData);
  return response.data;
};

export const getMyOrders = async () => {
  const response = await orderApiClient.get('/orders/me');
  return response.data;
};

export const getUserOrders = async (userId) => {
  if (userId === null || userId === undefined || userId === '') {
    return getMyOrders();
  }
  const response = await orderApiClient.get(`/orders/user/${userId}`);
  return response.data;
};

export const getOrderDetails = async (orderId) => {
  const response = await orderApiClient.get(`/orders/${orderId}`);
  return response.data;
};

export const getOrderPaymentStatus = async (orderId) => {
  const response = await orderApiClient.get(`/orders/${orderId}/payment-status`);
  return response.data;
};

export const cancelOrder = async (orderId) => {
  const response = await orderApiClient.put(`/orders/${orderId}/cancel`);
  return response.data;
};

export const confirmOrderReceived = async (orderId) => {
  const response = await orderApiClient.put(`/orders/${orderId}/confirm-received`);
  return response.data;
};

export const createMomoPayment = async (orderId) => {
  const response = await orderApiClient.post(`/orders/${orderId}/momo`);
  return response.data;
};

export const createVnpayPayment = async (orderId) => {
  const response = await orderApiClient.post(`/orders/${orderId}/vnpay`);
  return response.data;
};

export const updatePaymentStatus = async (orderId, status, transId = null) => {
  const response = await orderApiClient.put(`/orders/${orderId}/payment`, {
    trang_thai_thanh_toan: status,
    ma_giao_dich_thanh_cong: transId,
  });
  return response.data;
};

export default orderApiClient;
