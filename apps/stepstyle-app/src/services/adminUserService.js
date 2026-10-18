import { userApiClient } from './adminApiClient';

export const getUsers = async (params = {}) => {
  const response = await userApiClient.get('/users', { 
    params: { ...params, _t: new Date().getTime() } 
  });
  return response.data;
};

export const getUserById = async (id) => {
  const response = await userApiClient.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (data) => {
  const response = await userApiClient.post('/users', data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await userApiClient.put(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await userApiClient.delete(`/users/${id}`);
  return response.data;
};
