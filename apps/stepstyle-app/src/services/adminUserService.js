import adminApiClient from './adminApiClient';

export const getUsers = async (params) => {
  const response = await adminApiClient.get('/users', { params });
  return response.data;
};

export const getUserById = async (id) => {
  const response = await adminApiClient.get(`/users/${id}`);
  return response.data;
};
