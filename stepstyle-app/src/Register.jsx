import { Link } from "react-router-dom";

function Register(){
    return(
        <div className="flex min-h-screen">
            {/* Left Side */}
            <div className="grid grid-row-3 w-1/2 relative overflow-hidden bg-gradient-to-br from-neutral-900 to-orange-900">
                <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url(https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format)` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-900/90" />

                <div className="relative z-10 row-span-2 p-10">
                    <div className="flex items-center gap-3  mt-4">
                        {/* Logo */}
                        <div className="flex items-center justify-center rounded-xl bg-orange-400 w-10 h-10">
                            <p className="text-white text-2xl font-bold">S</p>
                        </div>
                        {/* Project name */}
                        <p className="text-white text-3xl font-bold">Step<span className="text-orange-400">Style</span></p>
                    </div>
                </div>

                

                <div className="relative z-10 row-span-1 p-10">
                    {/* Slogan */}
                    <p className="text-4xl font-bold text-white mt-10">
                        Tham gia cộng<br/>
                        đồng hàng nghìn<br/>
                        <span className="text-orange-400">tín đồ giày dép</span>
                    </p>
                    <p className="text-white text-xl mt-4">Đăng ký miễn phí — nhận ngay ưu đãi 30% cho đơn đầu tiên.</p>
                    
                    <div className="mt-4 flex items-center gap-4 text-white">
                        <div className="flex items-center gap-2 rounded-xl bg-gray-600/50 p-2">
                            <svg xmlns="http://w3.org" viewBox="0 0 24 24" fill="currentColor" width="24" height="24" className="text-orange-400">
                                <path d="M3 3h11v10h-11v-10zm13 3h4l3 3v4h-7v-7zm-13 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm13 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                            </svg>
                            Miễn phí ship
                        </div>

                        <div className="flex items-center gap-2 rounded-xl bg-gray-600/50 p-2">
                            <svg className="text-orange-400" xmlns="http://w3.org" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="9 14 4 9 9 4"></polyline>
                                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                            </svg>
                            Đổi trả 30 ngày
                        </div>

                        <div className="flex items-center gap-2 rounded-xl bg-gray-600/50 p-2">
                            <svg className="text-orange-400" xmlns="http://w3.org" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Hàng chính hãng
                        </div>
                    </div>
                </div>
            </div>


            {/* Right Side */}
            <div className="w-1/2 flex items-center justify-center">
                <div className="w-2/3">
                    <p className="text-4xl font-bold">Tạo tài khoản</p>
                    <p>Tham gia StepStyle ngay hôm nay.</p>
                    <form action="" className="mt-4 ">
                        <div>
                            <label htmlFor="" className="font-bold text-xs">
                                Họ và tên
                            </label>
                            <input className="mt-2 w-full border border-gray-300 rounded-xl p-2" type="text" name="" id="" placeholder="Nguyễn Văn A" required/>
                        </div>


                        <div>
                            <label htmlFor="" className="font-bold text-xs">
                                Email
                            </label>
                            <input className="mt-2 w-full border border-gray-300 rounded-xl p-2" type="email" name="" id="" placeholder="email@example.com" required/>
                        </div>


                        <div className="mt-4">
                            <label htmlFor="" className="font-bold text-xs">
                                Mật khẩu
                            </label>
                            <input className="mt-2 w-full border border-gray-300 rounded-xl p-2" type="password" name="" id="" placeholder="Ít nhất 6 ký tự" required/>
                        </div>


                        <div className="mt-4">
                            <label htmlFor="" className="font-bold text-xs">
                                Xác nhận mật khẩu
                            </label>
                            <input className="mt-2 w-full border border-gray-300 rounded-xl p-2" type="password" name="" id="" placeholder="Nhập lại mật khẩu" required/>
                        </div>

                        <button className="mt-4 w-full flex items-center justify-center p-4 bg-orange-500 text-white font-bold rounded-xl">Đăng Ký</button>
                    </form>

                    <p className="text-center text-xs mt-4">Bằng cách đăng ký, bạn đồng ý với <span className="text-orange-400 hover: cursor-pointer hover:underline underline-offset-1">Điều khoản dịch vụ</span> và <span className="text-orange-400 hover: cursor-pointer hover:underline underline-offset-1">Chính sách bảo mật</span> của chúng tôi.</p>

                    <p className="flex items-center justify-center mt-4">Đã có tài khoản? <Link to="/login" className="ml-2 text-orange-400 font-bold">Đăng nhập</Link></p>
                </div>
            </div>
        </div>
    );
}


export default Register;