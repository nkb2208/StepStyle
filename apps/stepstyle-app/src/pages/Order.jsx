import { useState, useEffect, useRef } from "react";
import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import { getUserOrders, cancelOrder, createMomoPayment, createVnpayPayment, updatePaymentStatus } from "../services/orderApiService";


    const getPaymentName = (methodId) => {
        if (methodId === 1) return 'Thanh toán khi nhận hàng (COD)';
        if (methodId === 2) return 'Thẻ Tín dụng/Ghi nợ';
        if (methodId === 3) return 'Thanh toán qua Momo';
        if (methodId === 4) return 'Chuyển khoản ngân hàng';
        if (methodId === 5) return 'Thanh toán qua VNPAY';
        return 'Chưa xác định';
    };

    const getOrderStatusText = (status) => {
        const statusMap = {
            PENDING: 'Chờ xác nhận',
            PROCESSING: 'Đang xử lý',
            SHIPPED: 'Đang giao hàng',
            DELIVERED: 'Đã giao hàng',
            CANCELLED: 'Đã hủy',
        };
        return statusMap[status] || status;
    };

    const getOrderStatusColor = (status) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-600';
            case 'PROCESSING':
                return 'bg-blue-100 text-blue-600';
            case 'SHIPPED':
                return 'bg-purple-100 text-purple-600';
            case 'DELIVERED':
                return 'bg-green-100 text-green-600';
            case 'CANCELLED':
                return 'bg-red-100 text-red-500';
            default:
                return 'bg-gray-100 text-gray-600';
        }
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
        const checkPaymentReturn = async () => {
            const params = new URLSearchParams(window.location.search);
            
            // Check MoMo callback
            const resultCode = params.get('resultCode');
            const momoOrderId = params.get('orderId');
            const momoTransId = params.get('transId');

            if (momoOrderId && resultCode !== null) {
                const realOrderId = momoOrderId.split('_')[0];
                if (resultCode === '0') {
                    try {
                        await updatePaymentStatus(realOrderId, 'SUCCESS', momoTransId);
                    } catch (e) {
                        console.error("Lỗi cập nhật trạng thái thanh toán MoMo:", e);
                    }
                }
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            // Check VNPAY callback
            const vnpResponseCode = params.get('vnp_ResponseCode');
            const vnpTxnRef = params.get('vnp_TxnRef');
            const vnpTransactionNo = params.get('vnp_TransactionNo');

            if (vnpTxnRef && vnpResponseCode !== null) {
                const realOrderId = vnpTxnRef.split('_')[0];
                if (vnpResponseCode === '00') {
                    try {
                        await updatePaymentStatus(realOrderId, 'SUCCESS', vnpTransactionNo);
                    } catch (e) {
                        console.error("Lỗi cập nhật trạng thái thanh toán VNPAY:", e);
                    }
                }
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            loadOrders();
        };

        checkPaymentReturn();
    }, []);

    const handleToggleOrder = (orderId) => {
        setOpenOrderId(prev => prev === orderId ? null : orderId);
    };

    const handlePayMomo = async (orderId) => {
        try {
            const res = await createMomoPayment(orderId);
            if (res?.payUrl) {
                window.location.href = res.payUrl;
            } else {
                alert("Không tạo được link thanh toán MoMo");
            }
        } catch (error) {
            console.error("Lỗi kết nối MoMo:", error);
            alert("Lỗi khi kết nối tới cổng thanh toán MoMo");
        }
    };

    const handlePayVnpay = async (orderId) => {
        try {
            const res = await createVnpayPayment(orderId);
            if (res?.payUrl) {
                window.location.href = res.payUrl;
            } else {
                alert("Không tạo được link thanh toán VNPAY");
            }
        } catch (error) {
            console.error("Lỗi kết nối VNPAY:", error);
            alert("Lỗi khi kết nối tới cổng thanh toán VNPAY");
        }
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
                
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                    <div>
                        <p className="text-2xl sm:text-3xl font-bold">Đơn hàng của tôi</p>
                        
                        <div className="mt-4">
                            {loading ? <p className="bg-white rounded-xl p-6 text-gray-500">Đang tải...</p> : orders.length === 0 ? <p className="bg-white rounded-xl p-6 text-gray-500">Chưa có đơn hàng nào.</p> : orders.map(order => (
                                <div key={order.ma_don_hang} className="relative mt-4">
                                    <button onClick={() => handleToggleOrder(order.ma_don_hang)} className={`w-full flex items-center justify-between gap-3 bg-white rounded-xl ${openOrderId === order.ma_don_hang ? 'rounded-b-none' : ''} p-4 sm:px-5 text-left cursor-pointer shadow-2xs`}>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                <p className="text-sm sm:text-base font-bold">ORDER-{order.ma_don_hang}</p>
                                                <div className={`px-2.5 py-0.5 rounded-xl text-xs font-bold ${getOrderStatusColor(order.trang_thai_don_hang)}`}>{getOrderStatusText(order.trang_thai_don_hang)}</div>
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 font-semibold text-xs sm:text-sm">
                                                <p>{new Date(order.ngay_dat).toLocaleDateString('vi-VN')}</p>
                                                <p>{order.items?.length || 0} sản phẩm</p>
                                                <p className="font-bold text-orange-400">{Number(order.tong_thanh_toan).toLocaleString('vi-VN')} đ</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center shrink-0 text-gray-500">
                                            {openOrderId !== order.ma_don_hang ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="6 9 12 15 18 9"></polyline>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="18 15 12 9 6 15"></polyline>
                                                </svg>
                                            )}
                                        </div>
                                    </button>

                                    {openOrderId === order.ma_don_hang && (
                                        <div className="w-full p-4 sm:p-5 bg-white flex flex-col gap-3 border-t border-gray-100 rounded-xl rounded-t-none shadow-lg">
                                            {order.items?.map((item, idx) => (
                                                <div key={item.ma_chi_tiet || item.ma_bien_the || idx} className="flex items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <img className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0" src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-sm sm:text-base line-clamp-2">{item.ten_san_pham}</p>
                                                            <p className="text-xs text-gray-500">Size {item.kich_co} • {item.mau_sac} • x{item.so_luong}</p>
                                                        </div>
                                                    </div>
                                                    <p className="font-bold text-sm sm:text-base shrink-0">{Number(item.don_gia).toLocaleString('vi-VN')} đ</p>
                                                </div>
                                            ))}

                                            <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                                                <div className="space-y-1">
                                                    <p className="text-gray-500 break-words">Giao đến: {order.dia_chi_giao_hang}</p>
                                                    <p className="text-gray-500 flex flex-wrap items-center gap-2">
                                                        <span>Thanh toán: {getPaymentName(order.payment?.ma_phuong_thuc)}</span>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${order.payment?.trang_thai_thanh_toan === 'SUCCESS' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'}`}>
                                                            {order.payment?.trang_thai_thanh_toan === 'SUCCESS' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                                        </span>
                                                    </p>
                                                </div>

                                                <div className="sm:text-right shrink-0">
                                                    <p className="text-xs sm:text-sm text-gray-500">Tổng cộng</p>
                                                    <p className="text-lg sm:text-xl font-bold text-orange-400">{Number(order.tong_thanh_toan).toLocaleString('vi-VN')}đ</p>
                                                </div>
                                            </div>

                                            {order.payment?.ma_phuong_thuc === 3 && order.payment?.trang_thai_thanh_toan !== 'SUCCESS' && order.trang_thai_don_hang === 'PENDING' && (
                                                <button onClick={(e) => { e.stopPropagation(); handlePayMomo(order.ma_don_hang); }} className="cursor-pointer mt-2 w-full font-bold p-3 bg-pink-500 hover:bg-pink-600 text-white text-sm sm:text-base rounded-xl">Thanh toán MoMo ngay</button>
                                            )}

                                            {order.payment?.ma_phuong_thuc === 5 && order.payment?.trang_thai_thanh_toan !== 'SUCCESS' && order.trang_thai_don_hang === 'PENDING' && (
                                                <button onClick={(e) => { e.stopPropagation(); handlePayVnpay(order.ma_don_hang); }} className="cursor-pointer mt-2 w-full font-bold p-3 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base rounded-xl">Thanh toán VNPAY ngay</button>
                                            )}

                                            {order.trang_thai_don_hang === 'PENDING' && (
                                                <button onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.ma_don_hang); }} className="cursor-pointer mt-1 w-full font-bold p-3.5 bg-red-400 text-white text-sm sm:text-base hover:bg-red-500 rounded-xl">Hủy đơn</button>
                                            )}
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