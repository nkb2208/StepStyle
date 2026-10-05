import adminApiClient from './adminApiClient';

export const getOrders = async (params) => {
  const response = await adminApiClient.get('/orders', { params });
  return response.data;
};

export const getOrderById = async (id) => {
  const response = await adminApiClient.get(`/orders/${id}`);
  return response.data;
};

export const updateOrderStatus = async (id, status) => {
  const response = await adminApiClient.put(`/orders/${id}`, { status });
  return response.data;
};
