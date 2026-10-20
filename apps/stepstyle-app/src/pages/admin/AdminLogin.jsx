import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as loginRequest, logout as logoutRequest, apiErrorMessage } from '../../services/authService';
import { getUsers } from '../../services/adminUserService';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu quản trị.');
      return;
    }

    setLoading(true);
    try {
      const { user, accessToken, refreshToken } = await loginRequest(email.trim(), password);

      // The admin panel is for administrators only.
      if (user?.role !== 'ADMIN') {
        setError('Tài khoản này không có quyền truy cập trang quản trị.');
        return;
      }

      localStorage.setItem('token', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

      try {
        const usersData = await getUsers({ page: 1, page_size: 100 });
        const list = usersData?.items || (Array.isArray(usersData) ? usersData : []);
        const matched = list.find(
          (u) => String(u.email).toLowerCase() === email.trim().toLowerCase()
        );
        if (matched && matched.kich_hoat === false) {
          await logoutRequest().catch(() => {});
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setError('Tài khoản của bạn đã bị khóa.');
          return;
        }
      } catch {
        // Ignore if user-service check is unavailable
      }

      localStorage.setItem('user', JSON.stringify(user));
      navigate('/admin');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Left Side - Luxury Brand Visual */}
      <div className="hidden lg:grid grid-rows-3 w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1200&fit=crop&auto=format)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-900/80 to-slate-950/95" />

        {/* Brand Top */}
        <div className="relative z-10 row-span-2 p-12">
          <div className="flex items-center gap-3.5 mt-2">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-950/40">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16.5C5 17.8 8 18.2 11.5 17.8C15.5 17.4 19 17.9 21.2 16.7C21.8 16.3 22 15.5 21.6 14.8C20.2 13.2 17.5 12.5 13 13C9 13.5 6 15 4 16.5Z" fill="currentColor" fillOpacity="0.25" />
                <path d="M6 14.2C7 11.2 9.5 7.8 12.5 6.2C14 5.4 15.5 6.2 16 7.8C16.5 9 15.8 10.2 14.5 11C17 10.7 19.5 11.7 21 13.7" />
                <path d="M10 11.5c2-.5 4.5-.3 7 1" />
              </svg>
            </div>
            <div>
              <p className="text-white text-2xl font-bold tracking-tight leading-none">
                Step<span className="text-indigo-400">Style</span>
              </p>
              <p className="text-slate-400 text-xs font-normal mt-1 tracking-wide">
                Hệ thống quản trị trung tâm &bull; Executive Portal
              </p>
            </div>
          </div>
        </div>

        {/* Brand Bottom Message */}
        <div className="relative z-10 row-span-1 p-12 flex flex-col justify-end">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-medium w-fit mb-4 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Hệ thống quản trị bảo mật cao
          </div>
          <p className="text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
            Quản trị & Vận hành <br />
            <span className="text-indigo-200">StepStyle Studio</span>
          </p>
          <p className="text-slate-300 text-sm mt-3 max-w-md leading-relaxed font-normal">
            Giám sát kho hàng, xử lý đơn đặt, đối soát doanh thu và tối ưu hóa trải nghiệm khách hàng theo thời gian thực.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-200/80 p-8 sm:p-10">
          <div className="flex items-center gap-3.5 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/25">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16.5C5 17.8 8 18.2 11.5 17.8C15.5 17.4 19 17.9 21.2 16.7C21.8 16.3 22 15.5 21.6 14.8C20.2 13.2 17.5 12.5 13 13C9 13.5 6 15 4 16.5Z" fill="currentColor" fillOpacity="0.25" />
                <path d="M6 14.2C7 11.2 9.5 7.8 12.5 6.2C14 5.4 15.5 6.2 16 7.8C16.5 9 15.8 10.2 14.5 11C17 10.7 19.5 11.7 21 13.7" />
                <path d="M10 11.5c2-.5 4.5-.3 7 1" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Đăng nhập Quản trị</h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Cổng truy cập dành riêng cho Quản trị viên StepStyle
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block font-medium text-xs text-slate-700 mb-1.5">
                Email quản trị
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@stepstyle.vn"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15 transition-all bg-slate-50/40 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block font-medium text-xs text-slate-700 mb-1.5">
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
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15 transition-all bg-slate-50/40 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-medium cursor-pointer"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none font-normal">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Ghi nhớ phiên đăng nhập</span>
              </label>
              <span className="text-slate-500 flex items-center gap-1 font-normal">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                SSL 256-bit
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full flex items-center justify-center py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md shadow-indigo-600/25 transition-all cursor-pointer text-sm"
            >
              {loading ? 'Đang xác thực hệ thống...' : 'Đăng nhập vào Bảng điều khiển'}
            </button>
          </form>

          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Không phải nhân sự quản trị?</span>
            <Link to="/home" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
              Về cửa hàng StepStyle &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
