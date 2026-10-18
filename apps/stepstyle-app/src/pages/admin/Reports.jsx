import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { formatPrice } from '../../data';
import {
  getOverviewReport,
  getMonthlyRevenue,
  getOrderStatusStats,
  getTopSellingProducts,
  getPaymentMethodStats,
  apiErrorMessage,
} from '../../services/adminReportingService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Fallback Mock Data
const DEFAULT_YEAR = new Date().getFullYear();

const FALLBACK_OVERVIEW = {
  year: DEFAULT_YEAR,
  total_revenue: 508000000,
  total_orders: 232,
  average_order_value: 2189655,
  successful_orders: 218,
  cancelled_orders: 14,
  cancel_rate: 6.0,
  top_month: 'Tháng 8',
  top_month_revenue: 95000000,
};

const FALLBACK_MONTHLY = [
  { month: 1, month_label: 'Tháng 1', revenue: 35000000, total_orders: 15, successful_orders: 14, cancelled_orders: 1, average_value: 2333333, cancel_rate: 6.7 },
  { month: 2, month_label: 'Tháng 2', revenue: 42000000, total_orders: 18, successful_orders: 17, cancelled_orders: 1, average_value: 2333333, cancel_rate: 5.6 },
  { month: 3, month_label: 'Tháng 3', revenue: 42000000, total_orders: 18, successful_orders: 17, cancelled_orders: 1, average_value: 2333333, cancel_rate: 5.6 },
  { month: 4, month_label: 'Tháng 4', revenue: 67000000, total_orders: 28, successful_orders: 26, cancelled_orders: 2, average_value: 2392857, cancel_rate: 7.1 },
  { month: 5, month_label: 'Tháng 5', revenue: 55000000, total_orders: 23, successful_orders: 22, cancelled_orders: 1, average_value: 2391304, cancel_rate: 4.3 },
  { month: 6, month_label: 'Tháng 6', revenue: 89000000, total_orders: 41, successful_orders: 38, cancelled_orders: 3, average_value: 2170732, cancel_rate: 7.3 },
  { month: 7, month_label: 'Tháng 7', revenue: 72000000, total_orders: 33, successful_orders: 31, cancelled_orders: 2, average_value: 2181818, cancel_rate: 6.1 },
  { month: 8, month_label: 'Tháng 8', revenue: 95000000, total_orders: 47, successful_orders: 45, cancelled_orders: 2, average_value: 2021277, cancel_rate: 4.3 },
  { month: 9, month_label: 'Tháng 9', revenue: 88000000, total_orders: 42, successful_orders: 41, cancelled_orders: 1, average_value: 2095238, cancel_rate: 2.4 },
  { month: 10, month_label: 'Tháng 10', revenue: 76000000, total_orders: 36, successful_orders: 34, cancelled_orders: 2, average_value: 2111111, cancel_rate: 5.5 },
  { month: 11, month_label: 'Tháng 11', revenue: 92000000, total_orders: 44, successful_orders: 42, cancelled_orders: 2, average_value: 2090909, cancel_rate: 4.5 },
  { month: 12, month_label: 'Tháng 12', revenue: 105000000, total_orders: 50, successful_orders: 48, cancelled_orders: 2, average_value: 2100000, cancel_rate: 4.0 },
];

const FALLBACK_TOP_PRODUCTS = [
  { product_name: 'Nike Air Max 270 React', total_sold: 142, total_revenue: 410380000, image_url: '' },
  { product_name: 'Adidas Ultra Boost 22', total_sold: 118, total_revenue: 411820000, image_url: '' },
  { product_name: 'Puma Velocity Nitro 2', total_sold: 95, total_revenue: 237500000, image_url: '' },
  { product_name: 'New Balance 574 Core', total_sold: 84, total_revenue: 168000000, image_url: '' },
  { product_name: 'Converse Chuck Taylor 70s', total_sold: 76, total_revenue: 114000000, image_url: '' },
];

const FALLBACK_ORDER_STATUS = [
  { status: 'DELIVERED', label: 'Đã giao thành công', count: 218, percentage: 93.9 },
  { status: 'PROCESSING', label: 'Đang xử lý', count: 12, percentage: 5.2 },
  { status: 'CANCELLED', label: 'Đã bị hủy', count: 14, percentage: 6.0 },
];

export default function Reports() {
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR);
  const [overview, setOverview] = useState(FALLBACK_OVERVIEW);
  const [monthlyData, setMonthlyData] = useState(FALLBACK_MONTHLY);
  const [topProducts, setTopProducts] = useState(FALLBACK_TOP_PRODUCTS);
  const [orderStatus, setOrderStatus] = useState(FALLBACK_ORDER_STATUS);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  // Data Loading
  const loadReports = useCallback(async (year) => {
    setLoading(true);
    setErrorNotice('');
    try {
      const [ovRes, monRes, topRes, stRes] = await Promise.all([
        getOverviewReport(year),
        getMonthlyRevenue(year),
        getTopSellingProducts(5, year),
        getOrderStatusStats(year),
      ]);

      if (ovRes) setOverview(ovRes);
      if (monRes?.items?.length) setMonthlyData(monRes.items);
      if (topRes?.items?.length) setTopProducts(topRes.items);
      if (stRes?.items?.length) setOrderStatus(stRes.items);
      setIsLive(true);
    } catch (err) {
      setErrorNotice(apiErrorMessage(err, 'Đang sử dụng dữ liệu thống kê mẫu (chưa kết nối được reporting-service).'));
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports(selectedYear);
  }, [selectedYear, loadReports]);

  // Chart Configurations: Monthly Revenue & Orders
  const monthlyChartData = {
    labels: monthlyData.map((m) => m.month_label),
    datasets: [
      {
        type: 'bar',
        label: 'Doanh thu (triệu đ)',
        data: monthlyData.map((m) => Math.round(m.revenue / 1000000)),
        backgroundColor: 'rgba(147, 51, 234, 0.75)',
        hoverBackgroundColor: 'rgba(147, 51, 234, 0.95)',
        borderRadius: 8,
        yAxisID: 'yRev',
      },
      {
        type: 'bar',
        label: 'Số đơn hàng',
        data: monthlyData.map((m) => m.total_orders),
        backgroundColor: 'rgba(251, 146, 60, 0.75)',
        hoverBackgroundColor: 'rgba(251, 146, 60, 0.95)',
        borderRadius: 8,
        yAxisID: 'yOrders',
      },
    ],
  };

  const monthlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { font: { size: 12, weight: '600' } } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            if (ctx.dataset.yAxisID === 'yRev') {
              return `Doanh thu: ${formatPrice(ctx.raw * 1000000)}`;
            }
            return `Số đơn: ${ctx.raw} đơn`;
          },
        },
      },
    },
    scales: {
      yRev: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Doanh thu (triệu đ)', font: { size: 11, weight: 'bold' } },
        grid: { color: 'rgba(241, 245, 249, 1)' },
      },
      yOrders: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Số đơn', font: { size: 11, weight: 'bold' } },
        grid: { drawOnChartArea: false },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  // Chart Configurations: Order Status Distribution
  const statusColors = {
    DELIVERED: '#10b981',
    PROCESSING: '#38bdf8',
    SHIPPED: '#6366f1',
    PENDING: '#f59e0b',
    CANCELLED: '#ef4444',
  };

  const orderStatusChartData = {
    labels: orderStatus.map((s) => s.label),
    datasets: [
      {
        data: orderStatus.map((s) => s.count),
        backgroundColor: orderStatus.map((s) => statusColors[s.status] || '#94a3b8'),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const orderStatusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw} đơn (${orderStatus[ctx.dataIndex]?.percentage || 0}%)`,
        },
      },
    },
    cutout: '65%',
  };

  const maxSold = topProducts[0]?.total_sold || 1;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Báo cáo & Thống kê doanh thu</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            <span className="text-xs font-medium text-slate-500">
              {isLive ? 'Kết nối trực tiếp Reporting Service (Cổng 4006)' : 'Chế độ xem trước dữ liệu mẫu'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:border-purple-500 bg-white"
          >
            {[2026, 2025, 2024, 2023].map((yr) => (
              <option key={yr} value={yr}>Năm {yr}</option>
            ))}
          </select>
          <button
            onClick={() => loadReports(selectedYear)}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-purple-500/20 disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

      {errorNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl">
          {errorNotice}
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `Tổng doanh thu (Năm ${selectedYear})`, value: formatPrice(overview.total_revenue), icon: '💰', sub: `Tháng cao nhất: ${overview.top_month}` },
          { label: 'Tổng số đơn hàng', value: `${overview.total_orders} đơn`, icon: '📦', sub: `Giao thành công: ${overview.successful_orders}` },
          { label: 'Giá trị đơn TB (AOV)', value: formatPrice(overview.average_order_value), icon: '📈', sub: 'Trung bình mỗi đơn đặt' },
          { label: 'Tỉ lệ hủy đơn', value: `${overview.cancel_rate}%`, icon: '📉', sub: `${overview.cancelled_orders} đơn đã bị hủy`, alert: overview.cancel_rate > 10 },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-xl mb-3">
              {k.icon}
            </div>
            <p className="text-2xl font-bold text-slate-900">{k.value}</p>
            <p className="text-sm text-slate-500 font-medium mt-0.5">{k.label}</p>
            <p className={`text-xs mt-2 font-medium ${k.alert ? 'text-red-500' : 'text-slate-400'}`}>
              {k.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base">Doanh thu & Số lượng đơn theo tháng</h3>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-lg">
              Năm {selectedYear}
            </span>
          </div>
          <div className="h-72">
            <Bar data={monthlyChartData} options={monthlyChartOptions} />
          </div>
        </div>

        {/* Order Status Doughnut Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-base mb-4">Tỷ lệ trạng thái đơn hàng</h3>
          <div className="h-64 relative flex items-center justify-center">
            <Doughnut data={orderStatusChartData} options={orderStatusChartOptions} />
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <span className="text-xs text-emerald-600 font-medium">Thành công</span>
              <p className="text-sm font-bold text-emerald-700">{overview.successful_orders} đơn</p>
            </div>
            <div className="p-2 bg-red-50 rounded-xl">
              <span className="text-xs text-red-500 font-medium">Đã hủy</span>
              <p className="text-sm font-bold text-red-600">{overview.cancelled_orders} đơn</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Best-Selling Products */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900 text-lg">Top 5 đôi giày bán chạy nhất</h3>
          <span className="text-xs text-slate-400">Xếp hạng theo số lượng bán</span>
        </div>
        <div className="space-y-4">
          {topProducts.map((p, idx) => (
            <div key={p.product_name + idx} className="flex items-center gap-4">
              <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 ${
                  idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{p.product_name}</p>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-sm font-bold text-purple-600">{formatPrice(p.total_revenue)}</span>
                    <span className="text-xs text-slate-400 ml-2">({p.total_sold} đôi)</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((p.total_sold / maxSold) * 100))}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Summary Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm overflow-hidden">
        <h3 className="font-bold text-slate-900 text-lg mb-4">Bảng tổng hợp chi tiết theo tháng</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-3.5 px-4 text-slate-600 font-semibold rounded-tl-xl">Tháng</th>
                <th className="text-left py-3.5 px-4 text-slate-600 font-semibold">Doanh thu</th>
                <th className="text-left py-3.5 px-4 text-slate-600 font-semibold">Tổng đơn</th>
                <th className="text-left py-3.5 px-4 text-slate-600 font-semibold">Đơn thành công</th>
                <th className="text-left py-3.5 px-4 text-slate-600 font-semibold">Đơn hủy</th>
                <th className="text-left py-3.5 px-4 text-slate-600 font-semibold">Tỉ lệ hủy</th>
                <th className="text-left py-3.5 px-4 text-slate-600 font-semibold rounded-tr-xl">Giá trị TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyData.map((m) => (
                <tr key={m.month} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{m.month_label}</td>
                  <td className="py-3.5 px-4 font-bold text-purple-600">{formatPrice(m.revenue)}</td>
                  <td className="py-3.5 px-4 text-slate-700">{m.total_orders}</td>
                  <td className="py-3.5 px-4 text-emerald-600 font-semibold">{m.successful_orders}</td>
                  <td className="py-3.5 px-4 text-red-500 font-semibold">{m.cancelled_orders}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        m.cancel_rate > 10 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {m.cancel_rate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{formatPrice(m.average_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
