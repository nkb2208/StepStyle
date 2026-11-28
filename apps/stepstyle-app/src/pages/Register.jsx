import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register, apiErrorMessage } from "../services/authService";
import { syncGuestCartToServer } from "../utils/cartHelper";

function Register(){
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!name.trim() || !email.trim() || !password || !confirmPassword) {
            setError("Vui lòng nhập đầy đủ thông tin.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);
        try {
            const { user, accessToken, refreshToken } = await register({
                name: name.trim(),
                email: email.trim(),
                password,
                role: "CUSTOMER",
            });

            if (accessToken) {
                localStorage.setItem("token", accessToken);
            }
            if (refreshToken) {
                localStorage.setItem("refreshToken", refreshToken);
            }
            if (user) {
                localStorage.setItem("user", JSON.stringify(user));
            }
            if (accessToken) {
                await syncGuestCartToServer();
            }

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
                    style={{ backgroundImage: `url(https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&fit=crop&auto=format)` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-900/90" />

                <div className="relative z-10 row-span-2 p-10">
                    <Link to="/home" className="flex items-center gap-3 mt-4 w-fit">
                        <div className="flex items-center justify-center rounded-xl bg-orange-400 w-10 h-10">
                            <p className="text-white text-2xl font-bold">S</p>
                        </div>
                        <p className="text-white text-3xl font-bold">Step<span className="text-orange-400">Style</span></p>
                    </Link>
                </div>

                <div className="relative z-10 row-span-1 p-10">
                    <p className="text-4xl font-bold text-white mt-10">
                        Tham gia cộng<br/>
                        đồng hàng nghìn<br/>
                        <span className="text-orange-400">tín đồ giày dép</span>
                    </p>
                    <p className="text-white text-xl mt-4">Đăng ký miễn phí — nhận ngay ưu đãi 30% cho đơn đầu tiên.</p>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-white text-sm">
                        <div className="flex items-center gap-2 rounded-xl bg-gray-600/50 p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="text-orange-400">
                                <path d="M3 3h11v10h-11v-10zm13 3h4l3 3v4h-7v-7zm-13 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm13 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                            </svg>
                            Miễn phí ship
                        </div>

                        <div className="flex items-center gap-2 rounded-xl bg-gray-600/50 p-2">
                            <svg className="text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 14 4 9 9 4"></polyline>
                                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                            </svg>
                            Đổi trả 30 ngày
                        </div>

                        <div className="flex items-center gap-2 rounded-xl bg-gray-600/50 p-2">
                            <svg className="text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Hàng chính hãng
                        </div>
                    </div>
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

                    <p className="text-2xl sm:text-4xl font-bold">Tạo tài khoản</p>
                    <p className="text-sm sm:text-base text-gray-500 mt-1">Tham gia StepStyle ngay hôm nay.</p>

                    {error && (
                        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                        <div>
                            <label htmlFor="register-name" className="font-bold text-xs">
                                Họ và tên
                            </label>
                            <input
                                className="mt-2 w-full border border-gray-300 rounded-xl p-3 text-sm sm:text-base outline-none focus:border-orange-400"
                                type="text"
                                name="name"
                                id="register-name"
                                placeholder="Nguyễn Văn A"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="register-email" className="font-bold text-xs">
                                Email
                            </label>
                            <input
                                className="mt-2 w-full border border-gray-300 rounded-xl p-3 text-sm sm:text-base outline-none focus:border-orange-400"
                                type="email"
                                name="email"
                                id="register-email"
                                placeholder="email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="register-password" className="font-bold text-xs">
                                Mật khẩu
                            </label>
                            <input
                                className="mt-2 w-full border border-gray-300 rounded-xl p-3 text-sm sm:text-base outline-none focus:border-orange-400"
                                type="password"
                                name="password"
                                id="register-password"
                                placeholder="Ít nhất 6 ký tự"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="register-confirm-password" className="font-bold text-xs">
                                Xác nhận mật khẩu
                            </label>
                            <input
                                className="mt-2 w-full border border-gray-300 rounded-xl p-3 text-sm sm:text-base outline-none focus:border-orange-400"
                                type="password"
                                name="confirmPassword"
                                id="register-confirm-password"
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center p-3.5 sm:p-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl disabled:opacity-60 cursor-pointer transition"
                        >
                            {loading ? "Đang đăng ký..." : "Đăng Ký"}
                        </button>
                    </form>

                    <p className="text-center text-xs mt-4 text-gray-500">Bằng cách đăng ký, bạn đồng ý với <span className="text-orange-400 hover:cursor-pointer hover:underline underline-offset-1">Điều khoản dịch vụ</span> và <span className="text-orange-400 hover:cursor-pointer hover:underline underline-offset-1">Chính sách bảo mật</span> của chúng tôi.</p>

                    <p className="flex flex-wrap items-center justify-center mt-4 text-sm">Đã có tài khoản? <Link to="/login" className="ml-1.5 text-orange-400 font-bold">Đăng nhập</Link></p>
                </div>
            </div>
        </div>
    );
}

export default Register;
