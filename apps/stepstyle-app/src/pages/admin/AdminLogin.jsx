import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu quản trị.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/admin');
    }, 300);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left Side - Admin Branding */}
      <div className="hidden lg:grid grid-rows-3 w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&fit=crop&auto=format)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-purple-950/70 to-slate-900/95" />

        <div className="relative z-10 row-span-2 p-12">
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center justify-center rounded-xl bg-purple-500 w-11 h-11 shadow-lg shadow-purple-500/30">
              <p className="text-white text-2xl font-bold">A</p>
            </div>
            <div>
              <p className="text-white text-2xl font-bold leading-none">
                Step<span className="text-purple-400">Style</span> Admin
              </p>
              <p className="text-purple-300 text-xs font-medium mt-1">
                Hệ thống quản trị trung tâm
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 row-span-1 p-12 flex flex-col justify-end">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold w-fit mb-4">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Admin Portal
          </span>
          <p className="text-4xl font-bold text-white leading-tight">
            Quản lý vận hành <br />
            <span className="text-purple-400">StepStyle</span> toàn diện
          </p>
          <p className="text-slate-300 text-base mt-3 max-w-md">
            Kiểm soát sản phẩm, đơn hàng, phân quyền nhân sự và theo dõi báo cáo doanh thu theo thời gian thực.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-100 p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Đăng nhập Admin</h1>
              <p className="text-xs text-slate-500 font-medium">
                Dành riêng cho Quản trị viên & Nhân sự hệ thống
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block font-bold text-xs text-slate-700 mb-1.5">
                Email quản trị
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@stepstyle.vn"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 transition-all"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block font-bold text-xs text-slate-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-purple-500 focus:ring-purple-500"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <span className="text-xs font-semibold text-purple-500">
                Bảo mật nội bộ
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center py-3.5 px-4 bg-purple-500 hover:bg-purple-600 disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-purple-500/20 transition-all cursor-pointer"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập Quản trị'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Không phải quản trị viên?</span>
            <Link to="/login" className="text-purple-500 hover:text-purple-600 font-bold">
              Về trang đăng nhập khách hàng →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
