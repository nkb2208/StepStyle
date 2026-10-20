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
import { getUsers } from '../../services/adminUserService';

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

  const [userDistribution, setUserDistribution] = useState([
    { role: 'ADMIN', label: 'Quản trị viên', color: 'bg-purple-500', count: USERS.filter((u) => u.role === 'admin').length || 1 },
    { role: 'STAFF', label: 'Nhân viên', color: 'bg-emerald-500', count: USERS.filter((u) => u.role === 'warehouse' || u.role === 'care').length || 4 },
    { role: 'CUSTOMER', label: 'Khách hàng', color: 'bg-orange-500', count: USERS.filter((u) => u.role === 'buyer').length || 24 },
  ]);

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
        const [ovRes, monRes, usersRes] = await Promise.allSettled([
          getOverviewReport(currentYear),
          getMonthlyRevenue(currentYear),
          getUsers({ page: 1, page_size: 100 }),
        ]);

        if (!isMounted) return;

        if (ovRes.status === 'fulfilled' && ovRes.value) {
          const ov = ovRes.value;
          setOverview((prev) => ({
            ...prev,
            totalRevenue: ov.total_revenue,
            totalOrders: ov.total_orders,
            cancelRate: ov.cancel_rate,
          }));
        }

        if (monRes.status === 'fulfilled' && monRes.value?.items?.length) {
          setMonthlyData(
            monRes.value.items.map((m) => ({
              month_label: `T${m.month}`,
              rev: Math.round(m.revenue / 1000000),
            }))
          );
        }

        if (usersRes.status === 'fulfilled' && usersRes.value) {
          const items = usersRes.value.items || (Array.isArray(usersRes.value) ? usersRes.value : []);
          const normalized = items.map((u) => String(u.vai_tro ?? u.role ?? 'CUSTOMER').toUpperCase());
          const adminCount = normalized.filter((r) => r === 'ADMIN').length;
          const staffCount = normalized.filter((r) => r === 'STAFF' || r === 'SELLER').length;
          const customerCount = normalized.filter((r) => r === 'CUSTOMER').length;

          setOverview((prev) => ({
            ...prev,
            buyers: customerCount,
            staff: adminCount + staffCount,
          }));

          setUserDistribution([
            { role: 'ADMIN', label: 'Quản trị viên', color: 'bg-purple-500', count: adminCount },
            { role: 'STAFF', label: 'Nhân viên', color: 'bg-emerald-500', count: staffCount },
            { role: 'CUSTOMER', label: 'Khách hàng', color: 'bg-orange-500', count: customerCount },
          ]);
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

  const totalUsers = userDistribution.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Tổng quan hệ thống</h2>
        <p className="text-slate-400 text-sm mt-0.5 font-normal">
          Thống kê hoạt động StepStyle — cập nhật lúc {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Tổng doanh thu',
            value: formatPrice(overview.totalRevenue),
            delta: `${overview.totalOrders} đơn hàng`,
            good: true,
            icon: (
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            bg: 'bg-indigo-50',
          },
          {
            label: 'Khách hàng',
            value: overview.buyers.toString(),
            delta: 'tài khoản khách hàng',
            good: true,
            icon: (
              <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ),
            bg: 'bg-sky-50',
          },
          {
            label: 'Nhân sự',
            value: overview.staff.toString(),
            delta: 'đang hoạt động',
            good: true,
            icon: (
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ),
            bg: 'bg-emerald-50',
          },
          {
            label: 'Tỉ lệ huỷ đơn',
            value: `${overview.cancelRate}%`,
            delta: overview.cancelRate < 8 ? 'Tốt' : 'Cần chú ý',
            good: overview.cancelRate < 8,
            icon: (
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            ),
            bg: 'bg-amber-50',
          },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center mb-3`}>{k.icon}</div>
            <p className="text-2xl font-bold text-slate-900">{k.value}</p>
            <p className="text-sm text-slate-500 font-normal">{k.label}</p>
            <p className={`text-xs mt-1 font-medium ${k.good ? 'text-emerald-500' : 'text-red-500'}`}>{k.delta}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Visual Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Doanh thu theo tháng (triệu đ)</h3>
            <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg">
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
            {userDistribution.map((r) => (
              <div key={r.role}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-normal text-slate-700">{r.label}</span>
                  <span className="font-semibold text-slate-900">{r.count}</span>
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
