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
    const rawRole = (response.data?.vai_tro || data.vai_tro || data.role || 'ADMIN').toUpperCase();
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

const findAuthUserByEmail = async (email) => {
  if (!email) return null;
  const res = await authUsersApiClient.get('/', { params: { page: 1, limit: 100 } });
  const list = res.data?.users || (Array.isArray(res.data) ? res.data : []);
  return list.find((u) => String(u.email).toLowerCase() === String(email).toLowerCase()) || null;
};

export const updateUser = async (id, data) => {
  const response = await userApiClient.put(`/users/${id}`, data);
  try {
    const updated = response.data;
    const authUser = await findAuthUserByEmail(updated?.email || data?.email);
    if (authUser) {
      const patch = {};
      if (data.ho_ten || data.name) patch.name = data.ho_ten || data.name;
      if (data.vai_tro || data.role) {
        const rawRole = String(data.vai_tro || data.role).toUpperCase();
        patch.role = rawRole === 'STAFF' ? 'SELLER' : rawRole;
      }
      if (Object.keys(patch).length > 0) {
        await authUsersApiClient.patch(`/${authUser.id}`, patch);
      }
    }
  } catch (err) {
    console.warn('Đồng bộ cập nhật tài khoản sang auth-service:', err?.response?.data || err?.message);
  }
  return response.data;
};

export const deleteUser = async (id) => {
  let targetEmail = null;
  try {
    const existing = await getUserById(id);
    targetEmail = existing?.email;
  } catch {
    // Ignore if user lookup fails
  }
  const response = await userApiClient.delete(`/users/${id}`);
  if (targetEmail) {
    try {
      const authUser = await findAuthUserByEmail(targetEmail);
      if (authUser) {
        await authUsersApiClient.delete(`/${authUser.id}`);
      }
    } catch (err) {
      console.warn('Đồng bộ xóa tài khoản sang auth-service:', err?.response?.data || err?.message);
    }
  }
  return response.data;
};
