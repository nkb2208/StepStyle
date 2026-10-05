import axios from 'axios';

const adminApiClient = axios.create({
  baseURL: import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4004/api/admin',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to extract data from { success: true, data: ... } envelope
adminApiClient.interceptors.response.use(
  (response) => {
    // If the backend wraps responses in a { success: true, data: ... } envelope
    if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
      // Modify response.data to just be the inner payload so existing services work without change
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to add auth token if needed
adminApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Adjust based on your auth logic
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default adminApiClient;
