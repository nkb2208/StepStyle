import axios from 'axios';

const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_API_URL || 'http://localhost:4000/api/auth';

const authApiClient = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

export const logout = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  try {
    const response = await authApiClient.post('/logout', { refreshToken });
    return response.data;
  } catch (error) {
    // Return or throw based on caller needs
    throw error;
  }
};

export const register = async (userData) => {
  const response = await authApiClient.post('/register', userData);
  return response.data;
};

export const refreshToken = async () => {
  const currentRefreshToken = localStorage.getItem('refreshToken');
  if (!currentRefreshToken) {
    throw new Error('No refresh token available');
  }
  const response = await authApiClient.post('/refresh', { refreshToken: currentRefreshToken });
  return response.data;
};

export const getProfile = async () => {
  const response = await authApiClient.get('/me');
  return response.data;
};

export const apiErrorMessage = (err) => {
  if (err?.response?.data?.error?.message) {
    return err.response.data.error.message;
  }
  if (err?.response?.data?.message) {
    return err.response.data.message;
  }
  if (typeof err?.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  if (err?.message) {
    return err.message;
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
};

export default authApiClient;
