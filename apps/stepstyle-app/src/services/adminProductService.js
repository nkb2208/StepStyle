import adminApiClient from './adminApiClient';

// Products
export const getProducts = async (params = {}) => {
  const response = await adminApiClient.get('/products', {params});
  return response.data;
};

export const findProducts = async (params) => {
  const response = await adminApiClient.get('/products/find' , {params});
  return response.data;
};

export const getProductById = async (id) => {
  const response = await adminApiClient.get(`/products/${id}`);
  return response.data;
};

export const createProduct = async (data) => {
  const response = await adminApiClient.post('/products/create', data);
  return response.data;
};

export const updateProduct = async (id, data) => {
  const response = await adminApiClient.put(`/products/update/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await adminApiClient.delete(`/products/delete/${id}`);
  return response.data;
};


// Variants
export const createVariant = async (data) => {
  const response = await adminApiClient.post('/products/variant/create', data);
  return response.data;
};

export const updateVariant = async (id, data) =>{
  const response = await adminApiClient.put(`/products/variant/update/${id}`, data);
  return response.data;
}

export const deleteVariant = async (id) => {
  const response = await adminApiClient.delete(`/products/variant/delete/${id}`);
  return response.data;
}

// Categories

export const getCategories = async (params = {}) => {
  const response = await adminApiClient.get('/products/categories', { params });
  return response.data;
}

export const createCategory = async (data) => {
  const response = await adminApiClient.post('/products/categories/create', data);
  return response.data;
};

export const updateCategory = async (id, data) => {
  const response = await adminApiClient.put(`/products/categories/update/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await adminApiClient.delete(`/products/categories/delete/${id}`);
  return response.data;
};
