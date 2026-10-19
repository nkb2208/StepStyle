import axios from 'axios';
import { refreshToken as requestRefreshToken } from './authService';

// Unwrap the backend's `{ success: true, data: ... }` envelope so callers keep
// receiving the inner payload directly.
const unwrapEnvelope = (response) => {
  if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
    response.data = response.data.data;
  }
  return response;
};

// Attach the bearer token issued by the auth service when one is stored.
const addAuthToken = (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

let refreshPromise = null;

const clearSessionAndRedirect = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/admin') &&
    window.location.pathname !== '/admin/login'
  ) {
    window.location.href = '/admin/login';
  }
};

const createClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });
  client.interceptors.request.use(addAuthToken, (error) => Promise.reject(error));
  client.interceptors.response.use(unwrapEnvelope, async (error) => {
    const originalConfig = error.config;
    if (error.response?.status === 401 && originalConfig && !originalConfig._retry) {
      originalConfig._retry = true;
      const storedRefresh = localStorage.getItem('refreshToken');
      if (!storedRefresh) {
        clearSessionAndRedirect();
        return Promise.reject(error);
      }

      try {
        if (!refreshPromise) {
          refreshPromise = requestRefreshToken().finally(() => {
            refreshPromise = null;
          });
        }
        const refreshed = await refreshPromise;
        if (refreshed?.accessToken) {
          localStorage.setItem('token', refreshed.accessToken);
          if (refreshed.refreshToken) {
            localStorage.setItem('refreshToken', refreshed.refreshToken);
          }
          originalConfig.headers = originalConfig.headers || {};
          originalConfig.headers.Authorization = `Bearer ${refreshed.accessToken}`;
          return client(originalConfig);
        }
      } catch {
        clearSessionAndRedirect();
        return Promise.reject(error);
      }
      clearSessionAndRedirect();
    }
    return Promise.reject(error);
  });
  return client;
};

// Admin Product CRUD service on port 8001.
const adminApiClient = createClient(
  import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:8001'
);

// System Configuration Service on /api/v1/settings (store, payment methods,
// shipping partners). Same envelope + auth behaviour as the admin client.
export const settingsApiClient = createClient(
  import.meta.env.VITE_SETTINGS_API_URL || 'http://localhost:4004/api/v1/settings'
);

// User Management Service on /api/v1 (users, profiles).
export const userApiClient = createClient(
  import.meta.env.VITE_USER_API_URL || 'http://localhost:4005/api/v1'
);

// Analytics & Reporting Service on /api/v1/reports
export const reportingApiClient = createClient(
  import.meta.env.VITE_REPORTING_API_URL || 'http://localhost:4006/api/v1/reports'
);

// Product Management Service on port 8001
export const productApiClient = createClient(
  import.meta.env.VITE_PRODUCT_API_URL || 'http://localhost:8001'
);

export default adminApiClient;

