import { settingsApiClient } from './adminApiClient';

/**
 * Fetch the public, unauthenticated storefront settings
 * (`GET /api/v1/settings/public`): enabled payment methods, enabled shipping
 * partners, base shipping fee, and free-shipping threshold.
 */
export const getPublicSettings = async () => {
  const response = await settingsApiClient.get('/public');
  return response.data;
};
