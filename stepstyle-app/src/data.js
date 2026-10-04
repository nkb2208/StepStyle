export const ORDERS = [
  { id: 'ORD-001', code: 'ORD-001', customerName: 'Lê Văn Mua', customerEmail: 'buyer@stepstyle.vn', date: '15/8/2025', total: 2890000, status: 'delivered', paymentMethod: 'Thẻ tín dụng' },
  { id: 'ORD-002', code: 'ORD-002', customerName: 'Phạm Thu Hương', customerEmail: 'huong@gmail.com', date: '1/9/2025', total: 4180000, status: 'processing', paymentMethod: 'COD' }
];

export const PRODUCTS = [
  { id: '1', name: 'Air Max 270 React', brand: 'Nike', category: 'Sneakers', price: 2890000, stock: 45, featured: true, revenue: 935760000, sold: 324 },
  { id: '2', name: 'Ultra Boost 22', brand: 'Adidas', category: 'Sneakers', price: 3490000, stock: 32, featured: true, revenue: 1816290000, sold: 521 }
];

export const USERS = [
  { id: 'u1', name: 'Nguyễn Minh Admin', email: 'admin@stepstyle.vn', role: 'admin', active: true, createdAt: '15/1/2024' },
  { id: 'u2', name: 'Trần Thị Care', email: 'care@stepstyle.vn', role: 'care', active: true, createdAt: '10/2/2024' },
  { id: 'u3', name: 'Lê Văn Mua', email: 'buyer@stepstyle.vn', role: 'buyer', active: true, createdAt: '10/8/2025' }
];

export const TOP_PRODUCTS = PRODUCTS.sort((a, b) => b.revenue - a.revenue).slice(0, 5);

export const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
};

export const imgUrl = (url) => url;
