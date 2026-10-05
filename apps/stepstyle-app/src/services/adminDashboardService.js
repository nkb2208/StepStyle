import adminApiClient from './adminApiClient';

export const getDashboardStats = async () => {
  const response = await adminApiClient.get('/dashboard/stats');
  return response.data;
};
