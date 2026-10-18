import axios from 'axios';

const authApiClient = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:4000/api/auth',
  headers: { 'Content-Type': 'application/json' },
});

authApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

authApiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export const login = async (email, password) => {
  const response = await authApiClient.post('/login', { email, password });
  return response.data;
};

export const register = async (payload) => {
  const response = await authApiClient.post('/register', payload);
  return response.data;
};

export const logout = async () => {
  const refreshToken = localStorage.getItem('refreshToken') || undefined;
  const response = await authApiClient.post('/logout', refreshToken ? { refreshToken } : {});
  return response.data;
};

export const getMe = async () => {
  const response = await authApiClient.get('/me');
  return response.data;
};

export const apiErrorMessage = (
  error,
  fallback = 'Đăng nhập thất bại, vui lòng kiểm tra lại thông tin.'
) => {
  const body = error?.response?.data;
  if (body?.error?.message) return body.error.message;
  if (typeof body === 'string' && body.trim()) return body;
  if (error?.message) return error.message;
  return fallback;
};
