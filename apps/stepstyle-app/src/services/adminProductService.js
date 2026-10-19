import { productApiClient } from './adminApiClient';

// Products
export const getProducts = async (params = {}) => {
  const response = await productApiClient.get('/products', {params});
  return response.data;
};

export const findProducts = async (params) => {
  const response = await productApiClient.get('/products/find' , {params});
  return response.data;
};

export const getProductById = async (id) => {
  const response = await productApiClient.get(`/products/${id}`);
  return response.data;
};

export const createProduct = async (data) => {
  const response = await productApiClient.post('/products/create', data);
  return response.data;
};

export const updateProduct = async (id, data) => {
  const response = await productApiClient.put(`/products/update/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await productApiClient.delete(`/products/delete/${id}`);
  return response.data;
};


// Variants
export const createVariant = async (data) => {
  const response = await productApiClient.post('/products/variant/create', data);
  return response.data;
};

export const updateVariant = async (id, data) =>{
  const response = await productApiClient.put(`/products/variant/update/${id}`, data);
  return response.data;
}

export const deleteVariant = async (id) => {
  const response = await productApiClient.delete(`/products/variant/delete/${id}`);
  return response.data;
}

// Categories

export const getCategories = async (params = {}) => {
  const response = await productApiClient.get('/products/categories', { params });
  return response.data;
}

export const createCategory = async (data) => {
  const response = await productApiClient.post('/products/categories/create', data);
  return response.data;
};

export const updateCategory = async (id, data) => {
  const response = await productApiClient.put(`/products/categories/update/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await productApiClient.delete(`/products/categories/delete/${id}`);
  return response.data;
};
