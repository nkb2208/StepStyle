import adminApiClient from './adminApiClient';

export const getSettings = async () => {
  const response = await adminApiClient.get('/store/settings');
  return response.data;
};

export const updateSettings = async (data) => {
  const response = await adminApiClient.put('/store/settings', data);
  return response.data;
};
