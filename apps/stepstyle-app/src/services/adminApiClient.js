import axios from 'axios';

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

const createClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });
  client.interceptors.response.use(unwrapEnvelope, (error) => Promise.reject(error));
  client.interceptors.request.use(addAuthToken, (error) => Promise.reject(error));
  return client;
};

// Admin CRUD service (products, orders, users, …) on /api/admin.
const adminApiClient = createClient(
  import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4004/api/admin'
);

// System Configuration Service on /api/v1/settings (store, payment methods,
// shipping partners). Same envelope + auth behaviour as the admin client.
export const settingsApiClient = createClient(
  import.meta.env.VITE_SETTINGS_API_URL || 'http://localhost:4004/api/v1/settings'
);

// User Management Service on /api/v1 (users, profiles).
export const userApiClient = createClient(
  import.meta.env.VITE_USER_API_URL || 'http://localhost:4005/api/v1'
// Analytics & Reporting Service on /api/v1/reports
);
export const reportingApiClient = createClient(
  import.meta.env.VITE_REPORTING_API_URL || 'http://localhost:4006/api/v1/reports'
);

export default adminApiClient;

