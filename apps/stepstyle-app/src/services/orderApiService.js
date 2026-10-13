import axios from 'axios';

const orderApiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const addToCart = async (userId, productId, variantId, quantity, price) => {
  const response = await orderApiClient.post('/cart/add', {
    ma_nguoi_dung: userId,
    ma_san_pham: productId,
    ma_bien_the: variantId,
    so_luong: quantity,
    gia: price
  });
  return response.data;
};

export const getCart = async (userId) => {
  const response = await orderApiClient.get(`/cart/${userId}`);
  return response.data;
};

export const updateCartItem = async (userId, variantId, quantity) => {
  const response = await orderApiClient.put('/cart/update', {
    ma_nguoi_dung: userId,
    ma_bien_the: variantId,
    so_luong: quantity
  });
  return response.data;
};

export const removeCartItem = async (userId, variantId) => {
  const response = await orderApiClient.delete('/cart/remove', {
    data: { ma_nguoi_dung: userId, ma_bien_the: variantId }
  });
  return response.data;
};

export const checkout = async (checkoutData) => {
  const response = await orderApiClient.post('/orders/checkout', checkoutData);
  return response.data;
};

export const getUserOrders = async (userId) => {
  const response = await orderApiClient.get(`/orders/user/${userId}`);
  return response.data;
};

export const getOrderDetails = async (orderId) => {
  const response = await orderApiClient.get(`/orders/${orderId}`);
  return response.data;
};

export const cancelOrder = async (orderId) => {
  const response = await orderApiClient.put(`/orders/${orderId}/cancel`);
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
    ma_giao_dich_thanh_cong: transId
  });
  return response.data;
};

export default orderApiClient;
