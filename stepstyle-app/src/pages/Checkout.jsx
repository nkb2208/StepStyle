import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";

function CheckOut(){
    return(
        <div className="bg-gray-100 flex flex-col min-h-screen">
            <div>
                <NavBar/>
            </div>


            <div className="p-10">
                <div className="p-10 mr-10 ml-10">
                    <p className="text-3xl font-bold">Thanh toán</p>

                    <div className="flex gap-4 mt-4">
                        <div className="w-2/3 bg-white p-3 rounded-xl">
                            <p className="font-bold ">Thông tin giao hàng</p>
                            <form className="mt-4" action="">
                                <div className="flex gap-4">
                                    <div className="w-1/2">
                                        <p>Họ và tên</p>
                                        <input className="border rounded-xl p-2 w-full" type="text" name="" id="" />
                                    </div>
                                    <div className="w-1/2">
                                        <p>Số điện thoại</p>
                                        <input className="border rounded-xl p-2 w-full" type="text" name="" id="" />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <p>Email</p>
                                    <input className="w-full p-2 rounded-xl border" type="email" name="" id="" />
                                </div>

                                <div className="mt-4">
                                    <p>Địa chỉ</p>
                                    <input placeholder="Số nhà, tên đường, phường/xã" className="w-full p-2 rounded-xl border" type="email" name="" id="" />
                                </div>

                                <div className="mt-4">
                                    <p>Thành phố</p>
                                    <select className="w-full p-2 rounded-xl border" name="" id="">
                                        <option value="">
                                            TP. Hồ Chí Minh
                                        </option>

                                        <option value="">
                                            Hà Nội
                                        </option>

                                        <option value="">
                                            Đà Nẵng
                                        </option>

                                        <option value="">
                                            Cần Thơ
                                        </option>
                                    </select>
                                </div>


                                
                                <div className="mt-4">
                                    <p>Ghi chú(Tùy chọn)</p>
                                    <textarea placeholder="Yêu cầu đặc biệt..." className="w-full p-2 rounded-xl border" type="email" name="" id="" />
                                </div>

                                <button className="w-full flex items-center justify-center p-3 bg-orange-400 rounded-xl">Tiếp tục {'->'}</button>
                            </form>
                        </div>


                        <div className="w-1/3 bg-white rounded-xl p-5 size-fit">
                            <p className="font-bold">Đơn hàng (<span>1</span> sản phẩm)</p>

                            <div className="pb-4 border-b mt-4 text-xs w-full flex items-center justify-between">
                                <p>Ultra Boots 22 x<span>1</span></p>
                                <p>3.490.000 ₫</p>
                            </div>

                            <div className="mt-4 text-xs w-full flex items-center justify-between">
                                <p>Tạm tính</p>
                                <p>3.490.000 ₫</p>
                            </div>

                            <div className="mt-4 text-xs w-full flex items-center justify-between">
                                <p>Vận chuyển</p>
                                <p className="text-green-500">Miễn phí</p>
                            </div>

                            <div className="text-md mt-4 w-full flex items-center justify-between">
                                <p className="font-bold">Tổng</p>
                                <p className="font-bold text-orange-400">3.490.000 ₫</p>
                            </div>
                        </div>
                    </div>
                </div >
            </div>

            <div className="mt-auto">
                <Footer/>
            </div>
        </div>

    );
}


export default CheckOut;