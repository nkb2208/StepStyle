import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCart, checkout } from "../services/orderApiService";

const getMeta = (ma_bien_the) => {
    let metadata = {};
    try {
        const stored = localStorage.getItem('variant_metadata');
        if (stored) metadata = JSON.parse(stored);
    } catch (e) {}
    return metadata[ma_bien_the] || {
        ten_san_pham: 'Sản phẩm ' + ma_bien_the,
        thuong_hieu: 'StepStyle',
        kich_co: '38',
        mau_sac: 'Trắng',
        hinh_anh: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format'
    };
};

function CustomerInfo({ info, setInfo }) {
    return(
        <>
            <form action="">
                <p className="font-bold">Thông tin giao hàng</p>

                <div className="flex justify-between items-center mt-4">
                    <div className="w-[49%]">
                        <label className="text-xs" htmlFor="">Họ và tên</label> <br />
                        <input value={info.ten_nguoi_nhan} onChange={e => setInfo({...info, ten_nguoi_nhan: e.target.value})} className="border border-gray-600 rounded-xl w-full p-2" type="text" />
                    </div>

                    <div className="w-[49%]">
                        <label className="text-xs" htmlFor="">Số điện thoại</label> <br />
                        <input value={info.so_dien_thoai_nhan} onChange={e => setInfo({...info, so_dien_thoai_nhan: e.target.value})} className="border border-gray-600 rounded-xl w-full p-2" type="text" />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="text-xs" htmlFor="">Email</label> <br />
                    <input className="border border-gray-600 rounded-xl w-full p-2" type="text" />
                </div>

                <div className="mt-4">
                    <label className="text-xs" htmlFor="">Địa chỉ</label> <br />
                    <input value={info.dia_chi_giao_hang} onChange={e => setInfo({...info, dia_chi_giao_hang: e.target.value})} className="border border-gray-600 rounded-xl w-full p-2" placeholder="Số nhà, tên đường, phường/xã" type="text" />
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

                <Link to='/checkout/purchase' className="mt-4 p-3 bg-orange-400 rounded-xl text-white font-bold flex justify-center items-center">Tiếp tục</Link>
            </form>
        </>
    );
}

function Purchase({ paymentMethod, setPaymentMethod }) {
    return(
        <>
            <p className="font-bold">Phương thức thanh toán</p>
            <div>
                <div className="flex items-center gap-3 mt-4">
                    <input type="radio" name="payment" id="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                    <label htmlFor="cod">Thanh toán khi nhận hàng (COD)</label>
                </div>

                <div className="flex items-center gap-3 mt-4">
                    <input type="radio" name="payment" id="creditcard" checked={paymentMethod === 'creditcard'} onChange={() => setPaymentMethod('creditcard')} />
                    <label htmlFor="creditcard">Thẻ Tín dụng/Ghi nợ</label>
                </div>

                <div className="flex items-center gap-3 mt-4">
                    <input type="radio" name="payment" id="momo" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} />
                    <label htmlFor="momo">Thanh toán qua Momo</label>
                </div>

                <div className="flex items-center gap-3 mt-4">
                    <input type="radio" name="payment" id="bank" checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} />
                    <label htmlFor="bank">Chuyển khoản ngân hàng</label>
                </div>

                {paymentMethod === 'creditcard' && (
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

function Confirmation({ info, paymentMethod, cartItems, handleCheckout }) {
    const getPaymentName = () => {
        if (paymentMethod === 'cod') return 'Thanh toán khi nhận hàng (COD)';
        if (paymentMethod === 'creditcard') return 'Thẻ Tín dụng/Ghi nợ';
        if (paymentMethod === 'momo') return 'Momo';
        if (paymentMethod === 'bank') return 'Chuyển khoản ngân hàng';
        return '';
    };

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
                                {(item.so_luong * 2890000).toLocaleString('vi-VN')} đ
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
                    <p className="font-bold">{getPaymentName()}</p>
                </div> 

                <div className="flex mt-4 gap-3">
                    <Link to='/checkout/purchase' className="w-1/2 flex items-center justify-center p-3 border border-gray-300 rounded-xl font-bold"> Quay lại </Link>
                    <button onClick={handleCheckout} className="w-1/2 flex items-center justify-center p-3 bg-orange-400 rounded-xl text-white font-bold">Hoàn tất</button>
                </div>
            </div>
        </>
    );
}

function CheckOut(){
    const [cart, setCart] = useState(null);
    const [info, setInfo] = useState({ ten_nguoi_nhan: '', so_dien_thoai_nhan: '', dia_chi_giao_hang: '', ghi_chu: '' });
    const [paymentMethod, setPaymentMethod] = useState('cod');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCart = async () => {
            const userId = localStorage.getItem("userId") || 1;
            const data = await getCart(userId);
            if (data && data.data) setCart(data.data);
        };
        fetchCart();
    }, []);

    const cartItems = cart?.items || [];
    const totalItems = cartItems.reduce((acc, item) => acc + item.so_luong, 0);
    const totalPrice = cartItems.reduce((acc, item) => acc + (item.so_luong * 2890000), 0);

    const handleCheckout = async () => {
        if (cartItems.length === 0) {
            alert("Giỏ hàng trống");
            return;
        }
        
        try {
            const userId = localStorage.getItem("userId") || 1;
            let ma_phuong_thuc = 1;
            if (paymentMethod === 'creditcard') ma_phuong_thuc = 2;
            else if (paymentMethod === 'momo') ma_phuong_thuc = 3;
            else if (paymentMethod === 'bank') ma_phuong_thuc = 4;

            const items = cartItems.map(i => { 
                const meta = getMeta(i.ma_bien_the); 
                return {
                    ma_bien_the: i.ma_bien_the,
                    ten_san_pham: meta.ten_san_pham,
                    kich_co: meta.kich_co,
                    mau_sac: meta.mau_sac,
                    so_luong: i.so_luong,
                    don_gia: 2890000
                };
            });

            const payload = {
                ma_nguoi_dung: userId,
                ten_nguoi_nhan: info.ten_nguoi_nhan || 'Khách hàng',
                so_dien_thoai_nhan: info.so_dien_thoai_nhan || '0123456789',
                dia_chi_giao_hang: info.dia_chi_giao_hang || 'Tại nhà',
                phi_van_chuyen: 0,
                tien_giam_gia: 0,
                ma_giam_gia: null,
                ghi_chu: info.ghi_chu || '',
                ma_phuong_thuc,
                items
            };

            await checkout(payload);
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
                                <Route path="/purchase" element={<Purchase paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} />} />
                                <Route path="/confirm" element={<Confirmation info={info} paymentMethod={paymentMethod} cartItems={cartItems} handleCheckout={handleCheckout} />} />
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
                                            <p>{(item.so_luong * 2890000).toLocaleString('vi-VN')} đ</p>
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
                                <p className="text-green-500">Miễn phí</p>
                            </div>

                            <div className="text-md mt-4 w-full flex items-center justify-between">
                                <p className="font-bold">Tổng cộng</p>
                                <p className="font-bold text-orange-400">{totalPrice.toLocaleString('vi-VN')} đ</p>
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