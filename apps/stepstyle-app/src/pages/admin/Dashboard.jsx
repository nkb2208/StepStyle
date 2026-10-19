import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { formatPrice, USERS } from '../../data';
import { getOverviewReport, getMonthlyRevenue } from '../../services/adminReportingService';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState({
    totalRevenue: 508000000,
    totalOrders: 232,
    cancelRate: 6.0,
    buyers: USERS.filter((u) => u.role === 'buyer').length || 24,
    staff: USERS.filter((u) => u.role !== 'buyer').length || 5,
  });

  const [monthlyData, setMonthlyData] = useState([
    { month_label: 'T1', rev: 35 },
    { month_label: 'T2', rev: 42 },
    { month_label: 'T3', rev: 42 },
    { month_label: 'T4', rev: 67 },
    { month_label: 'T5', rev: 55 },
    { month_label: 'T6', rev: 89 },
    { month_label: 'T7', rev: 72 },
    { month_label: 'T8', rev: 95 },
    { month_label: 'T9', rev: 88 },
    { month_label: 'T10', rev: 76 },
    { month_label: 'T11', rev: 92 },
    { month_label: 'T12', rev: 105 },
  ]);

  // Data Loading
  useEffect(() => {
    let isMounted = true;
    async function fetchDashboard() {
      setLoading(true);
      try {
        const [ov, mon] = await Promise.all([
          getOverviewReport(currentYear),
          getMonthlyRevenue(currentYear),
        ]);
        if (isMounted) {
          if (ov) {
            setOverview((prev) => ({
              ...prev,
              totalRevenue: ov.total_revenue,
              totalOrders: ov.total_orders,
              cancelRate: ov.cancel_rate,
            }));
          }
          if (mon?.items?.length) {
            setMonthlyData(
              mon.items.map((m) => ({
                month_label: `T${m.month}`,
                rev: Math.round(m.revenue / 1000000),
              }))
            );
          }
        }
      } catch {
        // Keep fallback data if service is not yet started
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, [currentYear]);

  // Chart Configuration
  const chartData = {
    labels: monthlyData.map((m) => m.month_label),
    datasets: [
      {
        label: 'Doanh thu (triệu đ)',
        data: monthlyData.map((m) => m.rev),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        hoverBackgroundColor: 'rgba(147, 51, 234, 1)',
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Doanh thu: ${ctx.raw} triệu đ`,
        },
      },
    },
    scales: {
      y: {
        grid: { color: 'rgba(241, 245, 249, 1)' },
        ticks: { font: { size: 11 } },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
  };

  const totalUsers = USERS.length || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Chào mừng trở lại 👋</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Tổng quan hệ thống StepStyle — cập nhật lúc {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng doanh thu', value: formatPrice(overview.totalRevenue), delta: '+12.4%', good: true, icon: '💰', bg: 'bg-purple-50', text: 'text-purple-600' },
          { label: 'Khách hàng', value: overview.buyers.toString(), delta: '+8 tháng này', good: true, icon: '👥', bg: 'bg-sky-50', text: 'text-sky-600' },
          { label: 'Nhân sự', value: overview.staff.toString(), delta: 'đang hoạt động', good: true, icon: '🧑‍💼', bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'Tỉ lệ huỷ đơn', value: `${overview.cancelRate}%`, delta: overview.cancelRate < 8 ? 'Tốt' : 'Cần chú ý', good: overview.cancelRate < 8, icon: '📉', bg: 'bg-amber-50', text: 'text-amber-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>{k.icon}</div>
            <p className="text-2xl font-bold text-slate-900">{k.value}</p>
            <p className="text-sm text-slate-500 font-medium">{k.label}</p>
            <p className={`text-xs mt-1 font-semibold ${k.good ? 'text-emerald-500' : 'text-red-500'}`}>{k.delta}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Visual Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Doanh thu theo tháng (triệu đ)</h3>
            <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-3 py-1.5 rounded-lg">
              Năm {currentYear}
            </span>
          </div>
          <div className="h-48">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* User Distribution */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-5">Phân bổ người dùng</h3>
          <div className="space-y-3">
            {[
              { role: 'admin', label: 'Quản trị viên', color: 'bg-purple-500', count: USERS.filter((u) => u.role === 'admin').length || 1 },
              { role: 'warehouse', label: 'Quản lý kho', color: 'bg-emerald-500', count: USERS.filter((u) => u.role === 'warehouse').length || 2 },
              { role: 'care', label: 'Chăm sóc viên', color: 'bg-sky-500', count: USERS.filter((u) => u.role === 'care').length || 2 },
              { role: 'buyer', label: 'Người mua', color: 'bg-orange-500', count: USERS.filter((u) => u.role === 'buyer').length || 24 },
            ].map((r) => (
              <div key={r.role}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{r.label}</span>
                  <span className="font-bold text-slate-900">{r.count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.count / totalUsers) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
