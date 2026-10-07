import adminApiClient from './adminApiClient';

export const getUsers = async (params = {}) => {
  const response = await adminApiClient.get('/users', { 
    params: { ...params, _t: new Date().getTime() } 
  });
  return response.data;
};

export const getUserById = async (id) => {
  const response = await adminApiClient.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (data) => {
  const response = await adminApiClient.post('/users', data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await adminApiClient.put(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await adminApiClient.delete(`/users/${id}`);
  return response.data;
};
