import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Products from './Products';
import Users from './Users';
import Reports from './Reports';
import Orders from './Orders';
import Settings from './Settings';

const navItems = [
  { id: 'dashboard', label: 'Tổng quan', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'products', label: 'Quản lý sản phẩm', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'users', label: 'Tài khoản & Phân quyền', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
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

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col fixed h-full z-30 shadow-sm">
        <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-3">
          <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900">StepStyle Admin</p>
            <p className="text-xs text-purple-500 font-medium">Super Admin</p>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center gap-3 bg-purple-50 rounded-2xl px-4 py-3">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-bold">N</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">Nguyễn Minh Admin</p>
              <p className="text-xs text-purple-500 font-medium">Quản trị viên</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={"w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all " + (activeTab === item.id ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20' : 'text-slate-600 hover:bg-slate-50')}>
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="leading-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={() => navigate('/login')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 w-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-64">
        <header className="bg-white border-b border-slate-100 h-16 flex items-center justify-between px-8 sticky top-0 z-20">
          <h1 className="text-xl font-bold text-slate-900">
            {navItems.find(i => i.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-sm shadow-emerald-500/50"></div>
            Hệ thống hoạt động bình thường
          </div>
        </header>
        <div className="p-8">
          {activeTab === 'dashboard' && <Dashboard MONTHLY={MONTHLY} maxRev={maxRev} />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'users' && <Users />}
          {activeTab === 'reports' && <Reports MONTHLY={MONTHLY} maxRev={maxRev} />}
          {activeTab === 'orders' && <Orders />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  );
}
