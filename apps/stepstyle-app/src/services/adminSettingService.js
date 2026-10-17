import { settingsApiClient } from './adminApiClient';

// Store information — `caidatcuahang`
export const getStoreSettings = async () => {
  const response = await settingsApiClient.get('/store');
  return response.data;
};

export const updateStoreSettings = async (payload) => {
  const response = await settingsApiClient.put('/store', payload);
  return response.data;
};

// Payment methods — `caidatphuongthucthanhtoan`
export const getPaymentMethods = async () => {
  const response = await settingsApiClient.get('/payment-methods');
  return response.data;
};

export const updatePaymentMethod = async (id, payload) => {
  const response = await settingsApiClient.put(`/payment-methods/${id}`, payload);
  return response.data;
};

// Shipping partners — `caidatdoitacvanchuyen`
export const getShippingPartners = async () => {
  const response = await settingsApiClient.get('/shipping-partners');
  return response.data;
};

export const updateShippingPartner = async (id, payload) => {
  const response = await settingsApiClient.put(`/shipping-partners/${id}`, payload);
  return response.data;
};

/**
 * Extract a human-readable message from an axios error returned by the API,
 * which uses the `{ success: false, error: { code, message } }` envelope.
 */
export const apiErrorMessage = (error, fallback = 'Đã xảy ra lỗi, vui lòng thử lại.') => {
  const body = error?.response?.data;
  if (body?.error?.message) return body.error.message;
  if (typeof body === 'string' && body.trim()) return body;
  if (error?.message) return error.message;
  return fallback;
};
