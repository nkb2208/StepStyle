import { settingsApiClient } from './adminApiClient';

/**
 * Fetch public store configuration (enabled payment methods, shipping partners,
 * and general store settings) for the customer-facing storefront.
 */
export const getPublicSettings = async () => {
  const response = await settingsApiClient.get('/public');
  return response.data;
};

export default {
  getPublicSettings,
};
