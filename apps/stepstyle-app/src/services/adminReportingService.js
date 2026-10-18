import { reportingApiClient } from './adminApiClient';

// Overview KPI Stats
export const getOverviewReport = async (year) => {
  const currentYear = year || new Date().getFullYear();
  const response = await reportingApiClient.get('/overview', {
    params: { year: currentYear },
  });
  return response.data;
};

// Monthly Revenue & Orders
export const getMonthlyRevenue = async (year) => {
  const currentYear = year || new Date().getFullYear();
  const response = await reportingApiClient.get('/monthly', {
    params: { year: currentYear },
  });
  return response.data;
};

// Order Status Distribution
export const getOrderStatusStats = async (year) => {
  const currentYear = year || new Date().getFullYear();
  const response = await reportingApiClient.get('/order-status', {
    params: { year: currentYear },
  });
  return response.data;
};

// Top Selling Products
export const getTopSellingProducts = async (limit = 5, year) => {
  const currentYear = year || new Date().getFullYear();
  const response = await reportingApiClient.get('/top-products', {
    params: { limit, year: currentYear },
  });
  return response.data;
};

// Payment Method Stats
export const getPaymentMethodStats = async () => {
  const response = await reportingApiClient.get('/payment-methods');
  return response.data;
};

// Error Helper
export const apiErrorMessage = (error, fallback = 'Không thể tải dữ liệu báo cáo.') => {
  const body = error?.response?.data;
  if (body?.error?.message) return body.error.message;
  if (typeof body === 'string' && body.trim()) return body;
  if (error?.message) return error.message;
  return fallback;
};
