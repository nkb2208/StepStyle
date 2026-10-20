import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout as logoutRequest } from '../../services/authService';
import Dashboard from './Dashboard';
import Products from './Products';
import Users from './Users';
import Reports from './Reports';
import Orders from './Orders';
import Settings from './Settings';

const navItems = [
  { id: 'dashboard', label: 'Tổng quan', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'products', label: 'Quản lý sản phẩm', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'users', label: 'Quản lý tài khoản', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'reports', label: 'Báo cáo & Doanh thu', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'orders', label: 'Theo dõi đơn hàng', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'settings', label: 'Cài đặt hệ thống', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

const MONTHLY = [
  { month: 'T3', rev: 42, orders: 18 }, { month: 'T4', rev: 67, orders: 28 },
  { month: 'T5', rev: 55, orders: 23 }, { month: 'T6', rev: 89, orders: 41 },
  { month: 'T7', rev: 72, orders: 33 }, { month: 'T8', rev: 95, orders: 47 },
  { month: 'T9', rev: 88, orders: 42 },
];
const maxRev = Math.max(...MONTHLY.map(r => r.rev));

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();
  const [session] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

  const adminName = session?.name || session?.email || 'Quản trị viên';
  const adminInitial = adminName.trim().charAt(0).toUpperCase() || 'A';

  const token = localStorage.getItem('token');
  const isAuthorized = Boolean(token && session?.role === 'ADMIN');

  // The admin panel is only reachable with an administrator's access token.
  useEffect(() => {
    if (!isAuthorized) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAuthorized, navigate]);

  if (!isAuthorized) {
    return null;
  }

  const handleLogout = async () => {
    // Best effort: revoke the session server-side, then clear it locally.
    try {
      await logoutRequest();
    } catch {
      // Ignore — the local session is cleared regardless.
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col fixed h-full z-30 shadow-xs">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 16.5C5 17.8 8 18.2 11.5 17.8C15.5 17.4 19 17.9 21.2 16.7C21.8 16.3 22 15.5 21.6 14.8C20.2 13.2 17.5 12.5 13 13C9 13.5 6 15 4 16.5Z" fill="currentColor" fillOpacity="0.25" />
              <path d="M6 14.2C7 11.2 9.5 7.8 12.5 6.2C14 5.4 15.5 6.2 16 7.8C16.5 9 15.8 10.2 14.5 11C17 10.7 19.5 11.7 21 13.7" />
              <path d="M10 11.5c2-.5 4.5-.3 7 1" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-slate-900 tracking-tight">Step<span className="text-indigo-600">Style</span></span>
              <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">Hub</span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal truncate">Quản trị & Vận hành</p>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-3 bg-slate-50/80 border border-slate-200/70 rounded-2xl p-2.5 shadow-xs">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-xs">
                {adminInitial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">{adminName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <p className="text-[10px] text-indigo-700 font-medium uppercase tracking-wider">Quản trị viên</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <svg className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                </svg>
                <span className="leading-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-3 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50/80 w-full transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 min-w-0">
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-16 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-normal">Bảng điều khiển StepStyle</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-xs font-medium text-emerald-700">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Hệ thống ổn định
            </div>
            <a 
              href="/home" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 bg-white transition-all shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Xem cửa hàng
            </a>
          </div>
        </header>

        <main className="p-8">
          {activeTab === 'dashboard' && <Dashboard MONTHLY={MONTHLY} maxRev={maxRev} />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'users' && <Users />}
          {activeTab === 'reports' && <Reports MONTHLY={MONTHLY} maxRev={maxRev} />}
          {activeTab === 'orders' && <Orders />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}
