import { orderApiClient } from './adminApiClient';

// Order Service (FastAPI, port 4007) — /api/v1/orders
export const getOrders = async (params = {}) => {
  const response = await orderApiClient.get('/orders', { params });
  return response.data; // { items, total, page, page_size }
};

export const getOrderStats = async () => {
  const response = await orderApiClient.get('/orders/stats');
  return response.data;
};

export const getOrderById = async (id) => {
  const response = await orderApiClient.get(`/orders/${id}`);
  return response.data;
};

export const updateOrderStatus = async (id, trangThai) => {
  const response = await orderApiClient.patch(`/orders/${id}/status`, { trang_thai: trangThai });
  return response.data;
};

export const updatePaymentStatus = async (id, trangThaiThanhToan) => {
  const response = await orderApiClient.patch(`/orders/${id}/payment`, {
    trang_thai_thanh_toan: trangThaiThanhToan,
  });
  return response.data;
};
