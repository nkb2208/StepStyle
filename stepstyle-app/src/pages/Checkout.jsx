import { useState } from "react";
import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import { Link } from "react-router-dom";
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';

function CustomerInfo(){
    return(
        <div>
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

                <Link to='/checkout/purchase' className="w-full flex items-center justify-center p-3 bg-orange-400 rounded-xl">Tiếp tục {'->'}</Link>
            </form>

        </div>
    );
}

function Purchase(){
    const [chooseMethod, setChooseMethod] = useState('cod');
    const [isOpen , setIsOpen] = useState(false);
    return(
        <>
            <p className="font-bold">Phương thức thanh toán</p>
            <div>
                <button onClick={()=> {setChooseMethod('cod') ; setIsOpen(false)}} className={chooseMethod=== 'cod'?"mt-4 flex items-center justify-start bg-orange-50 border border-orange-500 rounded-xl w-full p-5 font-bold":"mt-4 flex items-center justify-start border border-gray-300 rounded-xl w-full p-5 font-bold"}>
                    Thanh toán khi nhận hàng(COD)
                </button>

                <button onClick={()=> {setChooseMethod('creditcard'); setIsOpen(true)} } className={chooseMethod=== 'creditcard'?"mt-4 flex items-center justify-start bg-orange-50 border border-orange-500 rounded-xl w-full p-5 font-bold":"mt-4 flex items-center justify-start border border-gray-300 rounded-xl w-full p-5 font-bold"}>
                    Thẻ tín dụng / Ghi nợ
                </button>

                <button onClick={()=> {setChooseMethod('momo') ; setIsOpen(false)} } className={chooseMethod=== 'momo'?"mt-4 flex items-center justify-start bg-orange-50 border border-orange-500 rounded-xl w-full p-5 font-bold":"mt-4 flex items-center justify-start border border-gray-300 rounded-xl w-full p-5 font-bold"}>
                    Ví MoMo
                </button>

                <button onClick={()=> {setChooseMethod('bank'); setIsOpen(false)} } className={chooseMethod=== 'bank'?"mt-4 flex items-center justify-start bg-orange-50 border border-orange-500 rounded-xl w-full p-5 font-bold":"mt-4 flex items-center justify-start border border-gray-300 rounded-xl w-full p-5 font-bold"}>
                    Chuyển khoản ngân hàng
                </button>
                
                {isOpen && (
                    <div className="mt-4">
                        <form className="p-3 bg-gray-100 rounded-xl" action="">
                            <input className="border border-gray-300 rounded-xl w-full p-2" placeholder="Số thẻ" type="text" name="" id="" />

                            <div className="flex gap-3 mt-4">
                                <input className="border border-gray-300 rounded-xl w-1/2 p-2" placeholder="MM/YY" type="text" name="" id="" />
                                <input className="border border-gray-300 rounded-xl w-1/2 p-2" placeholder="CVV" type="text" name="" id="" />
                            </div>
                        </form>
                    </div>
                )}

                <div className="flex mt-4 gap-3">
                    <Link to='/checkout/info' className="w-1/2 flex items-center justify-center p-3 border border-gray-300 rounded-xl font-bold">{'<-'} Quay lại </Link>
                    <Link to='/checkout/confirm' className="w-1/2 flex items-center justify-center p-3 bg-orange-400 rounded-xl text-white font-bold">Tiếp tục {'->'}</Link>
                </div>
            </div>
        </>
    );
}


function Confirmation(){
    return(
        <>
            <p className="font-bold">Xác nhận đơn hàng</p>
            <div>
                <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">   
                        <img className="w-20 h-20 rounded-xl" src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                        <div>
                            <p className="font-bold">Ultra Boots 22</p>
                            <p className="text-xs text-gray-500">Size 38 - <span>Trắng</span></p>
                        </div>
                    </div>

                    <div>
                        3.490.000đ
                    </div>
                </div>

                <div className="mt-4 border-b border-gray-200 pb-4 flex items-center justify-between">
                    <p>Giao đến</p>
                    <p className="font-bold">789 Hai Bà Trưng, Q3,<br/> TP.HCM, TP. Hồ Chí Minh</p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p>Thanh toán</p>
                    <p className="font-bold">Thanh toán khi nhận hàng(COD)</p>
                </div> 

                <div className="flex mt-4 gap-3">
                    <Link to='/checkout/purchase' className="w-1/2 flex items-center justify-center p-3 border border-gray-300 rounded-xl font-bold">{'<-'} Quay lại </Link>
                    <Link to='/checkout/confirm' className="w-1/2 flex items-center justify-center p-3 bg-orange-400 rounded-xl text-white font-bold">Tiếp tục {'->'}</Link>
                </div>
            </div>
        
        </>
    );
}

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
                            <Routes>
                                <Route path="/" element={<CustomerInfo />} />
                                <Route path="/info" element={<CustomerInfo />} />
                                <Route path="/purchase" element={<Purchase />} />
                                <Route path="/confirm" element={<Confirmation />} />
                            </Routes>
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