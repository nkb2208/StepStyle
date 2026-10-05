import { Link } from "react-router-dom";

function Login(){
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
                        Bước vào<br/>
                        phong cách<br/>
                        <span className="text-orange-400">của bạn</span>
                    </p>

                    <p className="text-white text-xl mt-4">Hàng nghìn đôi giày chờ bạn khám phá.</p>
                </div>
            </div>


            {/* Right Side */}
            <div className="w-1/2 flex items-center justify-center">
                <div className="w-2/3">
                    <p className="text-4xl font-bold">Chào mừng trở lại!</p>
                    <p>Đăng nhập để tiếp tục mua sắm.</p>
                    <form action="" className="mt-4 ">
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
                            <input className="mt-2 w-full border border-gray-300 rounded-xl p-2" type="password" name="" id="" placeholder="••••••••" required/>
                        </div>

                        <button className="mt-4 w-full flex items-center justify-center p-4 bg-orange-500 text-white font-bold rounded-xl">Đăng nhập</button>
                    </form>

                    <p className="flex items-center justify-center mt-4">Chưa có tài khoản? <Link to="/register" className="ml-2 text-orange-400 font-bold">Đăng kí ngay</Link></p>
                </div>
            </div>
        </div>
    );
}


export default Login;