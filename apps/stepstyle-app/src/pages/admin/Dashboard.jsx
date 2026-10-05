import React, { useState, useEffect } from 'react';
import { formatPrice } from '../../data';
import { getDashboardStats } from '../../services/adminDashboardService';

export default function Dashboard({ MONTHLY, maxRev }) {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    buyers: 0,
    staff: 0,
    cancelRate: 0,
    monthly: MONTHLY || [],
    maxRev: maxRev || 100,
    userRoles: { admin: 0, warehouse: 0, care: 0, buyer: 0 },
    totalUsers: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // If your API returns data differently, you can map it here.
        // We'll try to use API data if available, otherwise fallback to default empty values mapped below.
        const data = await getDashboardStats();
        
        setStats(prev => ({
          ...prev,
          totalRevenue: data.totalRevenue ?? data.revenue ?? 0,
          buyers: data.buyers ?? data.customers ?? 0,
          staff: data.staff ?? data.employees ?? 0,
          cancelRate: data.cancelRate ?? 0,
          // Merge with any monthly stats from API
          monthly: data.monthly ?? prev.monthly,
          maxRev: data.maxRev ?? prev.maxRev,
          userRoles: data.userRoles ?? prev.userRoles,
          totalUsers: data.totalUsers ?? 1
        }));
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
        setError("Không thể tải dữ liệu tổng quan");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Đang tải dữ liệu...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Chào mừng trở lại 👋</h2>
        <p className="text-slate-400 text-sm mt-0.5">Tổng quan hệ thống StepStyle — cập nhật lúc {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng doanh thu', value: formatPrice(stats.totalRevenue), delta: '+12.4%', good: true, icon: '💰', bg: 'bg-purple-50', text: 'text-purple-600' },
          { label: 'Khách hàng', value: stats.buyers.toString(), delta: '+8 tháng này', good: true, icon: '👥', bg: 'bg-sky-50', text: 'text-sky-600' },
          { label: 'Nhân sự', value: stats.staff.toString(), delta: 'đang hoạt động', good: true, icon: '🧑‍💼', bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'Tỉ lệ huỷ đơn', value: stats.cancelRate + '%', delta: '-2% so với tháng trước', good: true, icon: '📉', bg: 'bg-amber-50', text: 'text-amber-600' }
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className={"w-10 h-10 " + k.bg + " rounded-xl flex items-center justify-center text-xl mb-3"}>{k.icon}</div>
            <p className="text-2xl font-bold text-slate-900">{k.value}</p>
            <p className="text-sm text-slate-500 font-medium">{k.label}</p>
            <p className={"text-xs mt-1 font-semibold " + (k.good ? 'text-emerald-500' : 'text-red-500')}>{k.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Doanh thu theo tháng (triệu đ)</h3>
            <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">2025</span>
          </div>
          <div className="flex items-end gap-2 h-40">
            {stats.monthly.map(r => (
              <div key={r.month} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full">
                  <div className="w-full bg-purple-500 rounded-t-lg group-hover:bg-purple-600 transition-colors"
                    style={{ height: ((r.rev / stats.maxRev) * 140) + 'px' }}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{r.rev}M</div>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{r.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-bold text-slate-900 mb-5">Phân bổ người dùng</h3>
          <div className="space-y-3">
            {[
              { role: 'admin', label: 'Quản trị viên', color: 'bg-purple-500' },
              { role: 'warehouse', label: 'Quản lý kho', color: 'bg-emerald-500' },
              { role: 'care', label: 'Chăm sóc viên', color: 'bg-sky-500' },
              { role: 'buyer', label: 'Người mua', color: 'bg-orange-500' }
            ].map(r => {
              const count = stats.userRoles[r.role] || 0;
              return (
                <div key={r.role}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{r.label}</span>
                    <span className="font-bold text-slate-900">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={"h-full rounded-full " + r.color} style={{ width: ((count / stats.totalUsers) * 100) + '%' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
