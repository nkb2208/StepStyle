import { useState, useEffect, useRef } from "react";
import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import { getUserOrders, cancelOrder } from "../services/orderApiService";


    const getPaymentName = (methodId) => {
        if (methodId === 1) return 'Thanh toán khi nhận hàng (COD)';
        if (methodId === 2) return 'Thẻ Tín dụng/Ghi nợ';
        if (methodId === 3) return 'Thanh toán qua Momo';
        if (methodId === 4) return 'Chuyển khoản ngân hàng';
        return 'Chưa xác định';
    };

function Order() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openOrderId, setOpenOrderId] = useState(null);
    const dropdownRef = useRef(null);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const userId = localStorage.getItem("userId") || 1;
            const data = await getUserOrders(userId);
            if (data && data.data) setOrders(data.data);
        } catch (error) {
            console.error("Lỗi tải đơn hàng:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const handleToggleOrder = (orderId) => {
        setOpenOrderId(prev => prev === orderId ? null : orderId);
    };

    const handleCancelOrder = async (orderId) => {
        try {
            await cancelOrder(orderId);
            loadOrders();
        } catch (error) {
            console.error("Lỗi hủy đơn:", error);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenOrderId(null); 
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return(
        <div  className="min-h-screen flex flex-col bg-gray-100">
            <div ref={dropdownRef} className="">
                <div className="">
                    <NavBar/>
                </div>
                
                <div  className="mt-10 w-full flex items-center justify-center">
                    <div className="w-1/2 m-10">
                        <p className="text-3xl font-bold">Đơn hàng của tôi</p>
                        
                        <div>
                            {loading ? <p>Đang tải...</p> : orders.length === 0 ? <p>Chưa có đơn hàng nào.</p> : orders.map(order => (
                                <div key={order.ma_don_hang} className="relative mt-4">
                                    <button onClick={() => handleToggleOrder(order.ma_don_hang)} className="w-full flex items-center justify-between bg-white rounded-xl  rounded-b-none p-3 pl-5 pr-5">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <p className="text-md font-bold">ORDER-{order.ma_don_hang}</p>
                                                <div className={`p-1 pr-2 pl-2 rounded-xl text-xs font-bold ${order.trang_thai_don_hang === 'CANCELLED' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>{order.trang_thai_don_hang}</div>
                                            </div>

                                            <div className="mt-3 flex items-center gap-3 text-gray-500 font-bold text-md">
                                                <p>{new Date(order.ngay_dat).toLocaleDateString('vi-VN')}</p>
                                                <p>{order.items?.length || 0} sản phẩm</p>
                                                <p className="font-bold text-orange-400">{Number(order.tong_thanh_toan).toLocaleString('vi-VN')} đ</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">


                                            {openOrderId !== order.ma_don_hang ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">                                            
                                                    <polyline points="5 12 12 5 19 12"></polyline>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="19 12 12 19 5 12"></polyline>
                                                </svg>
                                            )}
                                        </div>
                                    </button>                            

                                    {openOrderId === order.ma_don_hang && (
                                        <div className=" w-full p-3 bg-white flex flex-col gap-2 border-t border-gray-100  rounded-xl rounded-t-none shadow-lg">
                                            {order.items?.map(item => (
                                                <div>
                                                    <div key={item.ma_chi_tiet} className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                        <div className=" flex items-center gap-3">
                                                            <img className="w-20 h-20 rounded-xl" src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                                            <div>
                                                                <p>{item.ten_san_pham}</p>
                                                                <p className="text-xs text-gray-500">Size {item.kich_co} • {item.mau_sac} • x{item.so_luong}</p>
                                                            </div>
                                                        </div>
                                                        <p className="font-bold">{Number(item.don_gia).toLocaleString('vi-VN')} đ</p>
                                                    </div>

                                                    <div className="mt-4 flex items-center justify-between ">
                                                        <div>
                                                            <p className="text-gray-500">Giao đến: { order.dia_chi_giao_hang}</p>
                                                            <p className="text-gray-500">Thanh toán: {getPaymentName(order.payment?.ma_phuong_thuc)}</p>
                                                        </div>

                                                        <div>
                                                            <p className="flex items-center justify-end text-md text-gray-500">Tổng cộng</p>
                                                            <p className="text-xl font-bold text-orange-400">{Number(order.tong_thanh_toan).toLocaleString('vi-VN')}đ</p>
                                                        </div>
                                                    </div>

                                                    {order.trang_thai_don_hang === 'PENDING' && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.ma_don_hang); }} className="mt-4 w-full font-bold p-4 bg-red-400 text-white text-md hover:cursor-pointer hover:bg-red-500 rounded-xl">Hủy đơn</button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto">
                <Footer/>
            </div>
        </div>
    );
}

export default Order;