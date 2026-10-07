import adminApiClient from './adminApiClient';

export const getProducts = async (params = {}) => {
  const response = await adminApiClient.get('/products', { 
    params: { ...params, _t: new Date().getTime() } 
  });
  return response.data;
};

export const getProductById = async (id) => {
  const response = await adminApiClient.get(`/products/${id}`);
  return response.data;
};

export const createProduct = async (data) => {
  const response = await adminApiClient.post('/products', data);
  return response.data;
};

export const updateProduct = async (id, data) => {
  const response = await adminApiClient.put(`/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await adminApiClient.delete(`/products/${id}`);
  return response.data;
};
