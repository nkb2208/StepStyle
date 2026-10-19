import { userApiClient, authUsersApiClient } from './adminApiClient';

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
  try {
    const rawRole = (data.vai_tro || data.role || 'CUSTOMER').toUpperCase();
    const authRole = rawRole === 'STAFF' ? 'SELLER' : rawRole;
    await authUsersApiClient.post('/', {
      email: data.email,
      password: data.mat_khau || data.password,
      name: data.ho_ten || data.name,
      role: authRole,
    });
  } catch (err) {
    // Ignore if already exists in auth-service
    console.warn('Đồng bộ tài khoản sang auth-service:', err?.response?.data || err?.message);
  }
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
