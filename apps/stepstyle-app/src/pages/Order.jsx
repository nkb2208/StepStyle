import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import {
    getMyOrders,
    cancelOrder,
    confirmOrderReceived,
    createMomoPayment,
    createVnpayPayment,
} from "../services/orderApiService";
import { FALLBACK_PRODUCT_IMAGE } from "../services/storefrontProductService";
import { isCustomerLoggedIn, showToast } from "../utils/cartHelper";

const STATUS_TABS = [
    { key: "ALL", label: "Tất cả" },
    { key: "PENDING", label: "Chờ xác nhận" },
    { key: "PROCESSING", label: "Đang xử lý" },
    { key: "SHIPPED", label: "Đang giao hàng" },
    { key: "DELIVERED", label: "Giao thành công" },
    { key: "CANCELLED", label: "Đã hủy" },
];

const getPaymentName = (methodId) => {
    if (methodId === 1) return "Thanh toán khi nhận hàng (COD)";
    if (methodId === 2) return "Thẻ Tín dụng/Ghi nợ";
    if (methodId === 3) return "Thanh toán qua Momo";
    if (methodId === 4) return "Chuyển khoản ngân hàng";
    if (methodId === 5) return "Thanh toán qua VNPAY";
    return "Chưa xác định";
};

const getOrderStatusText = (status) => {
    const statusMap = {
        PENDING: "Chờ xác nhận",
        PROCESSING: "Đang xử lý",
        SHIPPED: "Đang giao hàng",
        DELIVERED: "Giao thành công",
        CANCELLED: "Đã hủy",
    };
    return statusMap[status] || status;
};

const getOrderStatusColor = (status) => {
    switch (status) {
        case "PENDING":
            return "bg-yellow-100 text-yellow-700";
        case "PROCESSING":
            return "bg-blue-100 text-blue-600";
        case "SHIPPED":
            return "bg-purple-100 text-purple-600";
        case "DELIVERED":
            return "bg-emerald-100 text-emerald-700";
        case "CANCELLED":
            return "bg-red-100 text-red-500";
        default:
            return "bg-gray-100 text-gray-600";
    }
};

function Order() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("ALL");
    const [openOrderId, setOpenOrderId] = useState(null);
    const [busyOrderId, setBusyOrderId] = useState(null);
    const [confirmModalOrder, setConfirmModalOrder] = useState(null);

    const loadOrders = async () => {
        if (!isCustomerLoggedIn()) {
            setOrders([]);
            setLoading(false);
            navigate("/login");
            return;
        }
        try {
            setLoading(true);
            const data = await getMyOrders();
            const list = Array.isArray(data?.data) ? data.data : [];
            setOrders(list);
        } catch (error) {
            console.error("Lỗi tải đơn hàng:", error);
            if (error?.response?.status === 401) {
                navigate("/login");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (
            params.has("gateway") ||
            params.has("paymentStatus") ||
            params.has("resultCode") ||
            params.has("vnp_ResponseCode")
        ) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        loadOrders();
    }, []);

    const filteredOrders = useMemo(() => {
        if (activeTab === "ALL") return orders;
        return orders.filter((o) => o.trang_thai_don_hang === activeTab);
    }, [orders, activeTab]);

    const statusCounts = useMemo(() => {
        const counts = { ALL: orders.length };
        for (const o of orders) {
            counts[o.trang_thai_don_hang] = (counts[o.trang_thai_don_hang] || 0) + 1;
        }
        return counts;
    }, [orders]);

    const handleToggleOrder = (orderId) => {
        setOpenOrderId((prev) => (prev === orderId ? null : orderId));
    };

    const handlePayMomo = async (orderId) => {
        try {
            const res = await createMomoPayment(orderId);
            if (res?.payUrl) {
                window.location.href = res.payUrl;
            } else {
                showToast("Không tạo được link thanh toán MoMo", "error");
            }
        } catch (error) {
            console.error("Lỗi kết nối MoMo:", error);
            showToast("Lỗi khi kết nối tới cổng thanh toán MoMo", "error");
        }
    };

    const handlePayVnpay = async (orderId) => {
        try {
            const res = await createVnpayPayment(orderId);
            if (res?.payUrl) {
                window.location.href = res.payUrl;
            } else {
                showToast("Không tạo được link thanh toán VNPAY", "error");
            }
        } catch (error) {
            console.error("Lỗi kết nối VNPAY:", error);
            showToast("Lỗi khi kết nối tới cổng thanh toán VNPAY", "error");
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm(`Bạn chắc chắn muốn hủy đơn ORDER-${orderId}?`)) return;
        try {
            setBusyOrderId(orderId);
            await cancelOrder(orderId);
            showToast("Đã hủy đơn hàng thành công");
            await loadOrders();
        } catch (error) {
            console.error("Lỗi hủy đơn:", error);
            showToast(error?.response?.data?.message || "Không thể hủy đơn hàng", "error");
        } finally {
            setBusyOrderId(null);
        }
    };

    const handleConfirmReceived = async (order) => {
        const orderId = order.ma_don_hang;
        try {
            setBusyOrderId(orderId);
            await confirmOrderReceived(orderId);
            setConfirmModalOrder(null);
            showToast("Xác nhận đã nhận hàng! Đơn đã chuyển sang Giao thành công.");
            await loadOrders();
            setOpenOrderId(orderId);
        } catch (error) {
            console.error("Lỗi xác nhận nhận hàng:", error);
            showToast(
                error?.response?.data?.message || "Không thể xác nhận đã nhận hàng",
                "error"
            );
        } finally {
            setBusyOrderId(null);
        }
    };

    const handleGoToRating = (order, item = null) => {
        const targetItem = item || order.items?.[0] || null;
        const productId = targetItem?.ma_san_pham || "";
        const query = new URLSearchParams({
            orderId: String(order.ma_don_hang),
            ...(productId ? { productId: String(productId) } : {}),
        }).toString();

        navigate(`/rating?${query}`, {
            state: {
                order,
                productId: productId ? Number(productId) : null,
            },
        });
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-100">
            <NavBar />

            <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">Đơn hàng của tôi</p>

                {/* Shopee-style status tabs */}
                <div className="mt-4 bg-white rounded-xl shadow-2xs overflow-x-auto">
                    <div className="flex min-w-max border-b border-gray-100">
                        {STATUS_TABS.map((tab) => {
                            const active = activeTab === tab.key;
                            const count = statusCounts[tab.key] || 0;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
                                        active
                                            ? "border-orange-500 text-orange-500 bg-orange-50/40"
                                            : "border-transparent text-gray-600 hover:text-orange-500"
                                    }`}
                                >
                                    {tab.label}
                                    {count > 0 && (
                                        <span
                                            className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${
                                                active
                                                    ? "bg-orange-500 text-white"
                                                    : "bg-gray-100 text-gray-500"
                                            }`}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Order List */}
                <div className="mt-4 space-y-4">
                    {loading ? (
                        <p className="bg-white rounded-xl p-6 text-gray-500">Đang tải đơn hàng...</p>
                    ) : filteredOrders.length === 0 ? (
                        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                            <p>Chưa có đơn hàng nào ở trạng thái này.</p>
                        </div>
                    ) : (
                        filteredOrders.map((order) => {
                            const isOpen = openOrderId === order.ma_don_hang;
                            const isBusy = busyOrderId === order.ma_don_hang;
                            const isShipped = order.trang_thai_don_hang === "SHIPPED";
                            const isDelivered = order.trang_thai_don_hang === "DELIVERED";

                            return (
                                <div
                                    key={order.ma_don_hang}
                                    className="bg-white rounded-xl shadow-2xs overflow-hidden border border-gray-100"
                                >
                                    {/* Order Header (click to expand) */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleOrder(order.ma_don_hang)}
                                        className="w-full flex items-center justify-between gap-3 p-4 sm:px-5 text-left cursor-pointer hover:bg-gray-50/70 transition"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                <p className="text-sm sm:text-base font-bold text-gray-900">
                                                    ORDER-{order.ma_don_hang}
                                                </p>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-xl text-xs font-bold ${getOrderStatusColor(
                                                        order.trang_thai_don_hang
                                                    )}`}
                                                >
                                                    {getOrderStatusText(order.trang_thai_don_hang)}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 font-semibold text-xs sm:text-sm">
                                                <p>{new Date(order.ngay_dat).toLocaleDateString("vi-VN")}</p>
                                                <p>{order.items?.length || 0} sản phẩm</p>
                                                <p className="font-bold text-orange-500">
                                                    {Number(order.tong_thanh_toan).toLocaleString("vi-VN")} đ
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 text-gray-400">
                                            <span className="hidden sm:inline text-xs font-medium">
                                                {isOpen ? "Thu gọn" : "Xem chi tiết"}
                                            </span>
                                            {!isOpen ? (
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

                                    {/* Quick Action Bar for SHIPPED (Shopee-style) when collapsed */}
                                    {!isOpen && isShipped && (
                                        <div className="px-4 sm:px-5 py-3 bg-orange-50/50 border-t border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                            <p className="text-xs sm:text-sm text-gray-600">
                                                Đơn hàng đang trên đường giao đến bạn. Khi nhận được hàng, hãy xác nhận bên dưới.
                                            </p>
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => setConfirmModalOrder(order)}
                                                className="shrink-0 cursor-pointer px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                                            >
                                                Đã nhận được hàng
                                            </button>
                                        </div>
                                    )}

                                    {/* Expanded Order Details */}
                                    {isOpen && (
                                        <div className="w-full p-4 sm:p-5 bg-white flex flex-col gap-3 border-t border-gray-100">
                                            {order.items?.map((item, idx) => (
                                                <div
                                                    key={item.ma_chi_tiet || item.ma_bien_the || idx}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <img
                                                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 bg-gray-100"
                                                            src={item.hinh_anh || FALLBACK_PRODUCT_IMAGE}
                                                            alt={item.ten_san_pham}
                                                            onError={(e) => {
                                                                e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                                                            }}
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2">
                                                                {item.ten_san_pham}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                Size {item.kich_co} • {item.mau_sac} • x{item.so_luong}
                                                            </p>
                                                            <p className="font-bold text-sm text-orange-500 mt-1 sm:hidden">
                                                                {Number(item.don_gia).toLocaleString("vi-VN")} đ
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                                        <p className="hidden sm:block font-bold text-sm sm:text-base text-gray-800">
                                                            {Number(item.don_gia).toLocaleString("vi-VN")} đ
                                                        </p>

                                                        {isDelivered && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleGoToRating(order, item)}
                                                                className="cursor-pointer px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white transition"
                                                            >
                                                                Đánh giá
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Address, Payment & Grand Total */}
                                            <div className="mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                                                <div className="space-y-1">
                                                    <p className="text-gray-600 break-words">
                                                        <span className="text-gray-400">Giao đến:</span>{" "}
                                                        {order.dia_chi_giao_hang}
                                                    </p>
                                                    <p className="text-gray-600 flex flex-wrap items-center gap-2">
                                                        <span>
                                                            <span className="text-gray-400">Thanh toán:</span>{" "}
                                                            {getPaymentName(order.payment?.ma_phuong_thuc)}
                                                        </span>
                                                        <span
                                                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                                                order.payment?.trang_thai_thanh_toan === "SUCCESS"
                                                                    ? "bg-green-100 text-green-600"
                                                                    : "bg-orange-100 text-orange-500"
                                                            }`}
                                                        >
                                                            {order.payment?.trang_thai_thanh_toan === "SUCCESS"
                                                                ? "Đã thanh toán"
                                                                : "Chưa thanh toán"}
                                                        </span>
                                                    </p>
                                                </div>

                                                <div className="sm:text-right shrink-0">
                                                    <p className="text-xs sm:text-sm text-gray-500">Tổng cộng</p>
                                                    <p className="text-lg sm:text-xl font-bold text-orange-500">
                                                        {Number(order.tong_thanh_toan).toLocaleString("vi-VN")}đ
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Shopee-style Action Buttons */}
                                            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                {isShipped && (
                                                    <>
                                                        <p className="text-xs text-gray-500">
                                                            Nhấn <b>Đã nhận được hàng</b> sau khi bạn đã kiểm tra sản phẩm.
                                                        </p>
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => setConfirmModalOrder(order)}
                                                            className="w-full sm:w-auto cursor-pointer px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm sm:text-base rounded-xl shadow-xs transition disabled:opacity-50"
                                                        >
                                                            {isBusy ? "Đang xác nhận..." : "Đã nhận được hàng"}
                                                        </button>
                                                    </>
                                                )}

                                                {isDelivered && (
                                                    <>
                                                        <p className="text-xs text-emerald-600 font-medium">
                                                            ✓ Đơn hàng đã giao thành công. Hãy chia sẻ cảm nhận của bạn về sản phẩm!
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGoToRating(order)}
                                                            className="w-full sm:w-auto cursor-pointer px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm sm:text-base rounded-xl shadow-xs transition"
                                                        >
                                                            Đánh giá
                                                        </button>
                                                    </>
                                                )}

                                                {order.trang_thai_don_hang === "PENDING" && (
                                                    <div className="w-full flex flex-col gap-2">
                                                        {order.payment?.ma_phuong_thuc === 3 &&
                                                            order.payment?.trang_thai_thanh_toan !== "SUCCESS" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handlePayMomo(order.ma_don_hang)}
                                                                    className="cursor-pointer w-full font-bold p-3 bg-pink-500 hover:bg-pink-600 text-white text-sm sm:text-base rounded-xl"
                                                                >
                                                                    Thanh toán MoMo ngay
                                                                </button>
                                                            )}

                                                        {order.payment?.ma_phuong_thuc === 5 &&
                                                            order.payment?.trang_thai_thanh_toan !== "SUCCESS" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handlePayVnpay(order.ma_don_hang)}
                                                                    className="cursor-pointer w-full font-bold p-3 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base rounded-xl"
                                                                >
                                                                    Thanh toán VNPAY ngay
                                                                </button>
                                                            )}

                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => handleCancelOrder(order.ma_don_hang)}
                                                            className="cursor-pointer w-full font-bold p-3 bg-red-400 hover:bg-red-500 text-white text-sm sm:text-base rounded-xl disabled:opacity-50"
                                                        >
                                                            {isBusy ? "Đang hủy..." : "Hủy đơn"}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Shopee-style Confirm Received Modal */}
            {confirmModalOrder && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    onClick={() => setConfirmModalOrder(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Xác nhận đã nhận hàng</h3>
                                <p className="text-xs text-gray-500">
                                    Đơn hàng ORDER-{confirmModalOrder.ma_don_hang}
                                </p>
                            </div>
                        </div>

                        <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                            Bạn xác nhận đã nhận được đầy đủ sản phẩm nguyên vẹn? Sau khi xác nhận, đơn hàng sẽ chuyển sang trạng thái{" "}
                            <span className="font-bold text-emerald-600">Giao thành công</span> và bạn có thể đánh giá sản phẩm ngay.
                        </p>

                        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setConfirmModalOrder(null)}
                                className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                                Chưa nhận được
                            </button>
                            <button
                                type="button"
                                disabled={busyOrderId === confirmModalOrder.ma_don_hang}
                                onClick={() => handleConfirmReceived(confirmModalOrder)}
                                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
                            >
                                {busyOrderId === confirmModalOrder.ma_don_hang
                                    ? "Đang xử lý..."
                                    : "Xác nhận đã nhận hàng"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-auto">
                <Footer />
            </div>
        </div>
    );
}

export default Order;
