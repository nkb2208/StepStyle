import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { getCart, checkout, createMomoPayment, createVnpayPayment } from "../services/orderApiService";
import { getPublicSettings } from "../services/storefrontSettingsService";

// Shown only when the settings service is unreachable, so checkout keeps working.
const DEFAULT_PAYMENT_OPTIONS = [
    { code: 'cod', name: 'Thanh toán khi nhận hàng (COD)', description: null },
    { code: 'card', name: 'Thẻ Tín dụng/Ghi nợ', description: null },
    { code: 'momo', name: 'Thanh toán qua Momo', description: null },
    { code: 'vnpay', name: 'Thanh toán qua VNPAY', description: null },
];

// Store-configuration payment `code` → numeric `ma_phuong_thuc` used by the
// order service (see `phuongthucthanhtoan` in StepStyle-v2.sql).
const PAYMENT_METHOD_IDS = {
    cod: 1,
    card: 2,
    creditcard: 2,
    momo: 3,
    bank_transfer: 4,
    bank: 4,
    vnpay: 5,
    zalopay: 6,
};

const getMeta = (ma_bien_the) => {
    let metadata = {};
    try {
        const stored = localStorage.getItem('variant_metadata');
        if (stored) metadata = JSON.parse(stored);
    } catch (e) {}
    return {
        ten_san_pham: 'Sản phẩm ' + ma_bien_the,
        thuong_hieu: 'StepStyle',
        don_gia: 2890000,
        kich_co: '38',
        mau_sac: 'Trắng',
        hinh_anh: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format',
        ...(metadata[ma_bien_the] || {})
    };
};

function CustomerInfo({ info, setInfo }) {
    const navigate = useNavigate();
    const [errors, setErrors] = useState({});

    const handleChange = (field, value) => {
        setInfo({ ...info, [field]: value });
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleNext = (e) => {
        e.preventDefault();
        const newErrors = {};

        if (!info.ten_nguoi_nhan || !info.ten_nguoi_nhan.trim()) {
            newErrors.ten_nguoi_nhan = "Vui lòng nhập họ và tên";
        }
        if (!info.so_dien_thoai_nhan || !info.so_dien_thoai_nhan.trim()) {
            newErrors.so_dien_thoai_nhan = "Vui lòng nhập số điện thoại";
        }
        if (!info.dia_chi_giao_hang || !info.dia_chi_giao_hang.trim()) {
            newErrors.dia_chi_giao_hang = "Vui lòng nhập địa chỉ giao hàng";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        navigate('/checkout/purchase');
    };

    return(
        <>
            <form onSubmit={handleNext}>
                <p className="font-bold">Thông tin giao hàng</p>

                <div className="flex justify-between items-start mt-4">
                    <div className="w-[49%]">
                        <label className={`text-xs ${errors.ten_nguoi_nhan ? 'text-red-500 font-bold' : ''}`} htmlFor="">Họ và tên *</label> <br />
                        <input 
                            value={info.ten_nguoi_nhan} 
                            onChange={e => handleChange('ten_nguoi_nhan', e.target.value)} 
                            className={`border rounded-xl w-full p-2 outline-none transition-colors ${errors.ten_nguoi_nhan ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-600 focus:border-orange-400'}`} 
                            type="text" 
                        />
                        {errors.ten_nguoi_nhan && <p className="text-red-500 text-xs mt-1">{errors.ten_nguoi_nhan}</p>}
                    </div>

                    <div className="w-[49%]">
                        <label className={`text-xs ${errors.so_dien_thoai_nhan ? 'text-red-500 font-bold' : ''}`} htmlFor="">Số điện thoại *</label> <br />
                        <input 
                            value={info.so_dien_thoai_nhan} 
                            onChange={e => handleChange('so_dien_thoai_nhan', e.target.value)} 
                            className={`border rounded-xl w-full p-2 outline-none transition-colors ${errors.so_dien_thoai_nhan ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-600 focus:border-orange-400'}`} 
                            type="text" 
                        />
                        {errors.so_dien_thoai_nhan && <p className="text-red-500 text-xs mt-1">{errors.so_dien_thoai_nhan}</p>}
                    </div>
                </div>

                <div className="mt-4">
                    <label className="text-xs" htmlFor="">Email</label> <br />
                    <input className="border border-gray-600 rounded-xl w-full p-2" type="text" />
                </div>

                <div className="mt-4">
                    <label className={`text-xs ${errors.dia_chi_giao_hang ? 'text-red-500 font-bold' : ''}`} htmlFor="">Địa chỉ *</label> <br />
                    <input 
                        value={info.dia_chi_giao_hang} 
                        onChange={e => handleChange('dia_chi_giao_hang', e.target.value)} 
                        className={`border rounded-xl w-full p-2 outline-none transition-colors ${errors.dia_chi_giao_hang ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-600 focus:border-orange-400'}`} 
                        placeholder="Số nhà, tên đường, phường/xã" 
                        type="text" 
                    />
                    {errors.dia_chi_giao_hang && <p className="text-red-500 text-xs mt-1">{errors.dia_chi_giao_hang}</p>}
                </div>

                <div className="mt-4">
                    <label className="text-xs" htmlFor="">Thành phố</label> <br />
                    <select className="border border-gray-600 rounded-xl w-full p-2" name="" id="">
                        <option value="">TP. Hồ Chí Minh</option>
                    </select>
                </div>

                <div className="mt-4">
                    <label className="text-xs" htmlFor="">Ghi chú(Tùy chọn)</label> <br />
                    <textarea value={info.ghi_chu} onChange={e => setInfo({...info, ghi_chu: e.target.value})} className="border border-gray-600 rounded-xl w-full p-2 text-xs h-20" placeholder="Yêu cầu đặc biệt..."></textarea>
                </div>

                <button type="submit" className="mt-4 p-3 bg-orange-400 hover:bg-orange-500 rounded-xl text-white font-bold flex justify-center items-center w-full">Tiếp tục</button>
            </form>
        </>
    );
}

function Purchase({ paymentMethod, setPaymentMethod, paymentOptions }) {
    return(
        <>
            <p className="font-bold">Phương thức thanh toán</p>
            <div>
                {paymentOptions.length === 0 && (
                    <p className="mt-4 text-sm text-gray-500">
                        Hiện chưa có phương thức thanh toán nào được bật.
                    </p>
                )}

                {paymentOptions.map(option => (
                    <div key={option.code} className="flex items-center gap-3 mt-4">
                        <input
                            type="radio"
                            name="payment"
                            id={`pay-${option.code}`}
                            checked={paymentMethod === option.code}
                            onChange={() => setPaymentMethod(option.code)}
                        />
                        <label htmlFor={`pay-${option.code}`}>
                            {option.name}
                            {option.description ? (
                                <span className="block text-xs text-gray-500">{option.description}</span>
                            ) : null}
                        </label>
                    </div>
                ))}

                {paymentMethod === 'card' && (
                    <div className="mt-4 pl-4 border-l-2 border-gray-300">
                        <form action="" className="w-full">
                            <input className="border border-gray-300 rounded-xl w-full p-2" placeholder="Số thẻ" type="text" name="" id="" />
                            <input className="border border-gray-300 rounded-xl w-full p-2 mt-4" placeholder="Tên in trên thẻ" type="text" name="" id="" />
                            
                            <div className="mt-4 w-full flex items-center justify-between gap-2">
                                <input className="border border-gray-300 rounded-xl w-1/2 p-2" placeholder="MM/YY" type="text" name="" id="" />
                                <input className="border border-gray-300 rounded-xl w-1/2 p-2" placeholder="CVV" type="text" name="" id="" />
                            </div>
                        </form>
                    </div>
                )}

                <div className="flex mt-4 gap-3">
                    <Link to='/checkout/info' className="w-1/2 flex items-center justify-center p-3 border border-gray-300 rounded-xl font-bold">Quay lại </Link>
                    <Link to='/checkout/confirm' className="w-1/2 flex items-center justify-center p-3 bg-orange-400 rounded-xl text-white font-bold">Tiếp tục</Link>
                </div>
            </div>
        </>
    );
}

function Confirmation({ info, paymentMethod, paymentOptions, cartItems, handleCheckout }) {
    const paymentName = paymentOptions.find(option => option.code === paymentMethod)?.name || '';

    return(
        <>
            <p className="font-bold">Xác nhận đơn hàng</p>
            <div>
                {cartItems.map((item, index) => {
                    const meta = getMeta(item.ma_bien_the);
                    return (
                        <div key={index} className="mt-4 border-b border-gray-200 pb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">   
                                <img className="w-20 h-20 rounded-xl" src={meta.hinh_anh} alt="" />
                                <div>
                                    <p className="font-bold">{meta.ten_san_pham}</p>
                                    <p className="text-xs text-gray-500">Size {meta.kich_co} - <span>{meta.mau_sac}</span> x{item.so_luong}</p>
                                </div>
                            </div>

                            <div>
                                {(item.so_luong * item.don_gia).toLocaleString('vi-VN')} đ
                            </div>
                        </div>
                    );
                })}

                <div className="mt-4 border-b border-gray-200 pb-4 flex items-center justify-between">
                    <p>Giao đến</p>
                    <p className="font-bold text-right">{info.ten_nguoi_nhan} - {info.so_dien_thoai_nhan}<br/>{info.dia_chi_giao_hang || "Chưa nhập địa chỉ"}</p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p>Thanh toán</p>
                    <p className="font-bold">{paymentName}</p>
                </div> 

                <div className="flex mt-4 gap-3">
                    <Link to='/checkout/purchase' className="w-1/2 flex items-center justify-center p-3 border border-gray-300 rounded-xl font-bold"> Quay lại </Link>
                    <button onClick={handleCheckout} className="w-1/2 hover:cursor-pointer flex items-center justify-center p-3 bg-orange-400 rounded-xl text-white font-bold">Đặt hàng</button>
                </div>
            </div>
        </>
    );
}

function CheckOut(){
    const [cart, setCart] = useState(null);
    const [info, setInfo] = useState({ ten_nguoi_nhan: '', so_dien_thoai_nhan: '', dia_chi_giao_hang: '', ghi_chu: '' });
    const [storeSettings, setStoreSettings] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCart = async () => {
            const userId = localStorage.getItem("userId") || 1;
            const data = await getCart(userId);
            if (data && data.data) setCart(data.data);
        };
        fetchCart();
    }, []);

    // Payment methods / shipping rules configured by the administrator.
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await getPublicSettings();
                if (settings) setStoreSettings(settings);
            } catch (error) {
                console.error("Không tải được cấu hình cửa hàng:", error);
            }
        };
        fetchSettings();
    }, []);

    const cartItems = (cart?.items || []).map(item => ({
        ...item,
        don_gia: Number(item.don_gia ?? getMeta(item.ma_bien_the).don_gia ?? 2890000)
    }));
    const totalItems = cartItems.reduce((acc, item) => acc + item.so_luong, 0);
    const totalPrice = cartItems.reduce((acc, item) => acc + (item.so_luong * item.don_gia), 0);

    // Only methods an admin enabled are offered; fall back to the built-in list
    // while the settings are still loading (or if the service is unreachable).
    const paymentOptions = useMemo(
        () => (storeSettings ? (storeSettings.payment_methods ?? []) : DEFAULT_PAYMENT_OPTIONS),
        [storeSettings]
    );
    const paymentMethod = paymentOptions.some(option => option.code === selectedPayment)
        ? selectedPayment
        : (paymentOptions[0]?.code ?? 'cod');

    // `order_value >= free_shipping_threshold ? 0 : base_shipping_fee`.
    const shippingFee = useMemo(() => {
        const base = Number(storeSettings?.base_shipping_fee ?? 0);
        const threshold = Number(storeSettings?.free_shipping_threshold ?? 0);
        return totalPrice >= threshold ? 0 : base;
    }, [storeSettings, totalPrice]);
    const orderTotal = totalPrice + shippingFee;

    const handleCheckout = async () => {
        if (cartItems.length === 0) {
            alert("Giỏ hàng trống");
            return;
        }
        
        try {
            const userId = localStorage.getItem("userId") || 1;
            const ma_phuong_thuc = PAYMENT_METHOD_IDS[paymentMethod] ?? 1;

            const items = cartItems.map(i => { 
                const meta = getMeta(i.ma_bien_the); 
                return {
                    ma_bien_the: i.ma_bien_the,
                    ten_san_pham: meta.ten_san_pham,
                    kich_co: meta.kich_co,
                    mau_sac: meta.mau_sac,
                    so_luong: i.so_luong,
                    don_gia: i.don_gia
                };
            });

            const payload = {
                ma_nguoi_dung: userId,
                ten_nguoi_nhan: info.ten_nguoi_nhan || 'Khách hàng',
                so_dien_thoai_nhan: info.so_dien_thoai_nhan || '0123456789',
                dia_chi_giao_hang: info.dia_chi_giao_hang || 'Tại nhà',
                phi_van_chuyen: shippingFee,
                tien_giam_gia: 0,
                ma_giam_gia: null,
                ghi_chu: info.ghi_chu || '',
                ma_phuong_thuc,
                items
            };

            const res = await checkout(payload);
            const createdOrder = res?.data;

            if(paymentMethod === 'momo' && createdOrder?.ma_don_hang){
                try{
                    const momoRes = await createMomoPayment(createdOrder.ma_don_hang);
                    if(momoRes?.payUrl){
                        window.location.href = momoRes.payUrl;
                        return;
                    }
                }catch(momoErr) {
                    console.error("Lỗi tạo thanh toán MoMo:", momoErr);
                    alert("Không thể chuyển hướng đến cổng MoMo. Đơn hàng đã được lưu!");
                }
            }

            if(paymentMethod === 'vnpay' && createdOrder?.ma_don_hang){
                try {
                    const vnpayRes = await createVnpayPayment(createdOrder.ma_don_hang);
                    if(vnpayRes?.payUrl){
                        window.location.href = vnpayRes.payUrl;
                        return;
                    }
                } catch (vnpayErr){
                    console.error("Lỗi tạo thanh toán VNPAY:", vnpayErr);
                    alert("Không thể chuyển hướng đến cổng VNPAY. Đơn hàng đã được lưu!");
                }
            }

            navigate("/order");
        } catch (error) {
            console.error("Lỗi đặt hàng:", error);
            alert("Đặt hàng thất bại");
        }
    };

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
                                <Route path="/" element={<CustomerInfo info={info} setInfo={setInfo} />} />
                                <Route path="/info" element={<CustomerInfo info={info} setInfo={setInfo} />} />
                                <Route path="/purchase" element={<Purchase paymentMethod={paymentMethod} setPaymentMethod={setSelectedPayment} paymentOptions={paymentOptions} />} />
                                <Route path="/confirm" element={<Confirmation info={info} paymentMethod={paymentMethod} paymentOptions={paymentOptions} cartItems={cartItems} handleCheckout={handleCheckout} />} />
                            </Routes>
                        </div>

                        <div className="w-1/3 bg-white rounded-xl p-5 size-fit">
                            <p className="font-bold">Đơn hàng (<span>{totalItems}</span> sản phẩm)</p>

                            <div className="pb-4 border-b mt-4 text-xs w-full flex flex-col gap-2">
                                {cartItems.map((item, idx) => {
                                    const meta = getMeta(item.ma_bien_the);
                                    return (
                                        <div key={idx} className="flex items-center justify-between">
                                            <p>{meta.ten_san_pham} x<span>{item.so_luong}</span></p>
                                            <p>{(item.so_luong * item.don_gia).toLocaleString('vi-VN')} đ</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 text-xs w-full flex items-center justify-between">
                                <p>Tạm tính</p>
                                <p>{totalPrice.toLocaleString('vi-VN')} đ</p>
                            </div>

                            <div className="mt-4 text-xs w-full flex items-center justify-between">
                                <p>Vận chuyển</p>
                                <p className={shippingFee === 0 ? 'text-green-500' : ''}>
                                    {shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')} đ`}
                                </p>
                            </div>

                            <div className="text-md mt-4 w-full flex items-center justify-between">
                                <p className="font-bold">Tổng cộng</p>
                                <p className="font-bold text-orange-400">{orderTotal.toLocaleString('vi-VN')} đ</p>
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