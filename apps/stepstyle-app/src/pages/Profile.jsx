import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import { Link } from "react-router-dom";

function Profile(){
    return(
        <div className="min-h-screen bg-gray-100">
            <div>
                <NavBar/>
            </div>

            <div className="mt-10 w-full flex items-center justify-center">
                <div className="w-1/2 m-10">
                    <p className="text-3xl font-bold">Hồ sơ của tôi</p>

                    <div className="flex items-center mt-4 p-5 pr-8 pl-8 gap-3 bg-white rounded-xl">
                        <div className=" flex items-center justify-center w-32 text-3xl font-bold text-orange-400 p-10 rounded-xl bg-orange-100">
                            L
                        </div>
                        <div>
                            <p className="text-2xl font-bold">Lê Văn Mua</p>
                            <p className="mt- text-gray-500">buyer@stepstyle.vn</p>
                            <p className="mt-1 p-1 pr-3 pl-3 text-orange-400 bg-orange-100 rounded-xl">Người mua hàng</p>
                        </div>
                    </div>

                    
                    <div className="mt-4 p-5 pr-8 pl-8 bg-white rounded-xl">
                        <p className="font-bold">Thông tin cá nhân</p>

                        <form className="mt-4" action="">
                            <div className='mt-4'>
                                <label className="font-bold text-md" htmlFor="">Họ và tên</label>
                                <input className="mt-2 border border-gray-500 rounded-xl p-3 w-full" type="text" name="" id="" placeholder="Lê Văn Mua" />
                            </div>
                            

                            <div className='mt-4'>
                                <label className="font-bold text-md" htmlFor="">Email</label>
                                <input className="mt-2 border border-gray-500 rounded-xl p-3 w-full" type="email" name="" id="" placeholder="buyer@stepstyle.vn" />
                                <p className="text-xs text-gray-500 mt-2">Email không thể thay đổi</p>
                            </div>


                            <div className='mt-4'>
                                <label className="font-bold text-md" htmlFor="">Số điện thoại</label>
                                <input className="mt-2 border border-gray-500 rounded-xl p-3 w-full" type="text" name="" id="" placeholder="0123456789" />
                            </div>

                            <div className='mt-4'>
                                <label className="font-bold text-md" htmlFor="">Địa chỉ</label>
                                <input className="mt-2 border border-gray-500 rounded-xl p-3 w-full" type="text" name="" id="" placeholder="789 Hai Bà Trưng, Q3, TP.HCM" />
                            </div>

                            <button className="mt-4 bg-orange-400 rounded-xl p-2 pr-3 pl-3 font-bold text-white">Lưu thay đổi</button>
                        </form>
                    </div>
                    
                    <div className="mt-4 p-5 pr-8 pl-8 bg-white rounded-xl">
                        <p className="mb-3 font-bold text-red-500 text-xl">Đăng xuất</p>

                        <p className="mb-3 text-md text-gray-500">Bạn sẽ cần đăng nhập lại để tiếp tục mua sắm.</p>

                        <Link to='/login' className="mt-3 bg-red-500 rounded-xl p-2 pr-3 pl-3 font-bold text-white">Đăng xuất</Link>
                    </div>
                </div>
            </div>


            <div>
                <Footer/>
            </div>
        </div>
    );
}


export default Profile;