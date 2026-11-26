import axios from 'axios';

export const LOYALTY_ORIGIN =
  import.meta.env.VITE_LOYALTY_API_URL || 'http://localhost:8002';

const client = axios.create({ baseURL: `${LOYALTY_ORIGIN}/api/v1` });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Service bọc phản hồi dạng { success, data }, ở đây gỡ lớp bọc ra
client.interceptors.response.use((res) => {
  if (res.data && res.data.success !== undefined && res.data.data !== undefined) {
    res.data = res.data.data;
  }
  return res;
});

export const getProfile = async () => (await client.get('/users/me')).data;

export const updateProfile = async (payload) =>
  (await client.put('/users/me', payload)).data;

export const uploadAvatar = async (file) => {
  const form = new FormData();
  form.append('file', file); // không tự đặt Content-Type, axios tự thêm boundary
  return (await client.post('/users/me/avatar', form)).data;
};

export const getMembership = async () =>
  (await client.get('/users/me/membership')).data;

// avatar_url từ service là đường dẫn tương đối (/static/avatars/...)
export const avatarSrc = (url) =>
  url ? (url.startsWith('http') ? url : `${LOYALTY_ORIGIN}${url}`) : null;


// ── Sổ địa chỉ ──────────────────────────────────────────────────────────────
export const listAddresses = async () =>
  (await client.get('/users/me/addresses')).data;

export const createAddress = async (payload) =>
  (await client.post('/users/me/addresses', payload)).data;

export const updateAddress = async (id, payload) =>
  (await client.put(`/users/me/addresses/${id}`, payload)).data;

export const setDefaultAddress = async (id) =>
  (await client.put(`/users/me/addresses/${id}/default`)).data;

export const deleteAddress = async (id) => {
  await client.delete(`/users/me/addresses/${id}`);
};

// ── Gói VIP ─────────────────────────────────────────────────────────────────
export const listPackages = async () => (await client.get('/vip/packages')).data;

export const purchasePackage = async (goiId) =>
  (await client.post('/vip/purchase', { goi_id: goiId })).data;

// Thanh toán giả lập (chỉ dùng demo, service phải bật VIP_MOCK_PAYMENT=true)
export const mockPay = async (maGiaoDich) =>
  (await client.post(`/vip/transactions/${maGiaoDich}/mock-pay`)).data;

export const listTransactions = async () =>
  (await client.get('/vip/transactions')).data;