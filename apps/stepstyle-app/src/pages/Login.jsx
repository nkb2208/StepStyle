import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, apiErrorMessage } from "../services/authService";
import { syncGuestCartToServer } from "../utils/cartHelper";

function Login(){
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password) {
            setError("Vui lòng nhập đầy đủ email và mật khẩu.");
            return;
        }

        setLoading(true);
        try {
            const { user, accessToken, refreshToken } = await login(email.trim(), password);
            localStorage.setItem("token", accessToken);
            if (refreshToken) {
                localStorage.setItem("refreshToken", refreshToken);
            }
            localStorage.setItem("user", JSON.stringify(user));
            await syncGuestCartToServer();
            const redirectTo = sessionStorage.getItem("post_login_redirect") || "/home";
            sessionStorage.removeItem("post_login_redirect");
            navigate(redirectTo);
        } catch (err) {
            setError(apiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return(
        <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 lg:bg-white">
            {/* Left Side */}
            <div className="hidden lg:grid grid-row-3 lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-neutral-900 to-orange-900">
                <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url(https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format)` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-900/90" />

                <div className="relative z-10 row-span-2 p-10">
                    <Link to="/home" className="flex items-center gap-3 mt-4 w-fit">
                        {/* Logo */}
                        <div className="flex items-center justify-center rounded-xl bg-orange-400 w-10 h-10">
                            <p className="text-white text-2xl font-bold">S</p>
                        </div>
                        {/* Project name */}
                        <p className="text-white text-3xl font-bold">Step<span className="text-orange-400">Style</span></p>
                    </Link>
                </div>

                <div className="relative z-10 row-span-1 p-10">
                    {/* Slogan */}
                    <p className="text-4xl font-bold text-white mt-10">
                        Bước vào<br/>
                        phong cách<br/>
                        <span className="text-orange-400">của bạn</span>
                    </p>

                    <p className="text-white text-xl mt-4">Hàng nghìn đôi giày chờ bạn khám phá.</p>
                </div>
            </div>

            {/* Right Side */}
            <div className="w-full lg:w-1/2 flex flex-1 items-center justify-center p-5 sm:p-10">
                <div className="w-full max-w-md bg-white lg:bg-transparent p-6 sm:p-8 lg:p-0 rounded-2xl lg:rounded-none shadow-sm lg:shadow-none border border-gray-100 lg:border-0">
                    <Link to="/home" className="flex lg:hidden items-center gap-2.5 mb-6 w-fit">
                        <div className="flex items-center justify-center rounded-xl bg-orange-400 w-9 h-9">
                            <p className="text-white text-xl font-bold">S</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">Step<span className="text-orange-400">Style</span></p>
                    </Link>

                    <p className="text-2xl sm:text-4xl font-bold">Chào mừng trở lại!</p>
                    <p className="text-sm sm:text-base text-gray-500 mt-1">Đăng nhập để tiếp tục mua sắm.</p>

                    {error && (
                        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-5">
                        <div>
                            <label htmlFor="login-email" className="font-bold text-xs">
                                Email
                            </label>
                            <input
                                className="mt-2 w-full border border-gray-300 rounded-xl p-3 text-sm sm:text-base outline-none focus:border-orange-400"
                                type="email"
                                name="email"
                                id="login-email"
                                placeholder="email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="mt-4">
                            <label htmlFor="login-password" className="font-bold text-xs">
                                Mật khẩu
                            </label>
                            <input
                                className="mt-2 w-full border border-gray-300 rounded-xl p-3 text-sm sm:text-base outline-none focus:border-orange-400"
                                type="password"
                                name="password"
                                id="login-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-5 w-full flex items-center justify-center p-3.5 sm:p-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl disabled:opacity-60 cursor-pointer transition"
                        >
                            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                        </button>
                    </form>

                    <p className="flex flex-wrap items-center justify-center mt-5 text-sm">Chưa có tài khoản? <Link to="/register" className="ml-1.5 text-orange-400 font-bold">Đăng kí ngay</Link></p>
                </div>
            </div>
        </div>
    );
}


export default Login;