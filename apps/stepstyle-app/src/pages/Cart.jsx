import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCart, updateCartItem, removeCartItem } from "../services/orderApiService";

const STOCK_BY_COLOR_AND_SIZE = {
    'Trắng': { '38': 15, '39': 12, '40': 10, '41': 8, '42': 5 },
    'Đen':   { '38': 10, '39': 14, '40': 9,  '41': 6, '42': 0 },
    'Đỏ':    { '38': 8,  '39': 6,  '40': 11, '41': 0, '42': 4 },
    'Xám':   { '38': 7,  '39': 9,  '40': 5,  '41': 4, '42': 3 },
    'Xanh':  { '38': 6,  '39': 0,  '40': 8,  '41': 5, '42': 2 },
};
const AVAILABLE_COLORS = Object.keys(STOCK_BY_COLOR_AND_SIZE);
const ALL_SIZES = ['38', '39', '40', '41', '42'];

function Cart(){
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [metadata, setMetadata] = useState(() => {
        try {
            const stored = localStorage.getItem('variant_metadata');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            return {};
        }
    });
    const userId = localStorage.getItem("userId") || 1;

    const loadCart = async () => {
        try {
            setLoading(true);
            const data = await getCart(userId);
            if (data && data.data) setCart(data.data);
            else setCart(null);
        } catch (error) {
            console.error("Lỗi lấy giỏ hàng:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCart();
    }, []);

    const getMeta = (ma_bien_the) => ({
        ten_san_pham: 'Sản phẩm ' + ma_bien_the,
        thuong_hieu: 'StepStyle',
        don_gia: 2890000,
        kich_co: '38',
        mau_sac: 'Trắng',
        hinh_anh: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format',
        ...(metadata[ma_bien_the] || {})
    });

    const handleUpdateQuantity = async (variantId, newQty, maxStock = 99) => {
        if (newQty < 1 || newQty > maxStock) return;
        try {
            const meta = getMeta(variantId);
            await updateCartItem(userId, variantId, newQty, {
                kich_co: String(meta.kich_co),
                mau_sac: meta.mau_sac
            });
            loadCart();
        } catch (error) {
            console.error("Lỗi cập nhật số lượng:", error);
        }
    };

    const handleUpdateVariant = async (item, newSize, newColor) => {
        const colorStockMap = STOCK_BY_COLOR_AND_SIZE[newColor] || STOCK_BY_COLOR_AND_SIZE['Trắng'];
        let validSize = String(newSize);
        if ((colorStockMap[validSize] ?? 0) <= 0) {
            validSize = ALL_SIZES.find(s => (colorStockMap[s] ?? 0) > 0) || '38';
        }

        const currentMeta = getMeta(item.ma_bien_the);
        const updatedMetadata = {
            ...metadata,
            [item.ma_bien_the]: {
                ...currentMeta,
                kich_co: validSize,
                mau_sac: newColor
            }
        };

        setMetadata(updatedMetadata);
        localStorage.setItem('variant_metadata', JSON.stringify(updatedMetadata));

        const maxStock = colorStockMap[validSize] ?? 10;
        const adjustedQty = item.so_luong > maxStock ? maxStock : item.so_luong;

        try {
            await updateCartItem(userId, item.ma_bien_the, adjustedQty, {
                kich_co: validSize,
                mau_sac: newColor
            });
            if (adjustedQty !== item.so_luong) {
                loadCart();
            }
        } catch (error) {
            console.error("Lỗi cập nhật phân loại:", error);
        }
    };

    const handleRemoveItem = async (variantId) => {
        try {
            await removeCartItem(userId, variantId);
            loadCart();
        } catch (error) {
            console.error("Lỗi xóa:", error);
        }
    };

    const totalItems = cart?.items?.reduce((acc, item) => acc + item.so_luong, 0) || 0;
    const totalPrice = cart?.items?.reduce((acc, item) => acc + item.so_luong * Number(item.don_gia ?? getMeta(item.ma_bien_the).don_gia ?? 2890000), 0) || 0;

    return( 
        <div className="bg-gray-100 flex flex-col min-h-screen">
            <div>
                <NavBar/>
            </div>

            {/* Body */}
            <div className="p-10">
                <div className="p-10 mr-10 ml-10">
                    <p className="text-3xl font-bold">Giỏ hàng <span className="text-orange-400">- {cart?.items?.length || 0} sản phẩm</span></p>

                    <div className="gap-4 flex mt-4" >
                        <div className="w-2/3 flex flex-col gap-4">
                            {loading ? <p>Đang tải...</p> : (!cart || !cart.items || cart.items.length === 0) ? <p>Giỏ hàng trống</p> : cart.items.map(item => {
                                const meta = getMeta(item.ma_bien_the);
                                const currentColor = AVAILABLE_COLORS.includes(meta.mau_sac) ? meta.mau_sac : 'Trắng';
                                const currentSize = String(meta.kich_co || '38');
                                const currentStock = STOCK_BY_COLOR_AND_SIZE[currentColor]?.[currentSize] ?? 10;

                                return (
                                <div key={item.ma_bien_the} className="pr-2 pl-2 pt-5 pb-3 bg-white rounded-xl flex w-full size-fit">
                                    <div className=" flex items-center justify-center w-1/6">
                                        <img className="w-24 h-24 rounded-xl" src={meta.hinh_anh} alt="" />
                                    </div>

                                    <div className="w-5/6">
                                        <div>
                                            <div className="w-full flex items-center justify-between">
                                                <p className="font-bold text-xs text-blue-500">{meta.thuong_hieu}</p>
                                                <button className="hover:cursor-pointer" onClick={() => handleRemoveItem(item.ma_bien_the)}>
                                                    <svg className="text-gray-500 hover:text-red-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M3 6h18" />
                                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                        <line x1="10" y1="11" x2="10" y2="17" />
                                                        <line x1="14" y1="11" x2="14" y2="17" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <p className="font-bold">{meta.ten_san_pham}</p>

                                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-gray-500">Màu sắc:</span>
                                                    <select
                                                        value={currentColor}
                                                        onChange={(e) => handleUpdateVariant(item, currentSize, e.target.value)}
                                                        className="border border-gray-300 rounded-lg px-2 py-1 bg-gray-50 hover:border-orange-400 focus:border-orange-500 focus:outline-none font-medium text-gray-800 cursor-pointer"
                                                    >
                                                        {AVAILABLE_COLORS.map(color => (
                                                            <option key={color} value={color}>{color}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-gray-500">Size:</span>
                                                    <select
                                                        value={currentSize}
                                                        onChange={(e) => handleUpdateVariant(item, e.target.value, currentColor)}
                                                        className="border border-gray-300 rounded-lg px-2 py-1 bg-gray-50 hover:border-orange-400 focus:border-orange-500 focus:outline-none font-medium text-gray-800 cursor-pointer"
                                                    >
                                                        {ALL_SIZES.map(size => {
                                                            const stock = STOCK_BY_COLOR_AND_SIZE[currentColor]?.[size] ?? 0;
                                                            return (
                                                                <option key={size} value={size} disabled={stock <= 0}>
                                                                    Size {size} {stock > 0 ? `(Còn ${stock})` : '(Hết hàng)'}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>

                                                <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-md font-medium">
                                                    Còn {currentStock} sản phẩm
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between w-full">
                                            <div className="w-24 flex items-center gap-2 border border-gray-300 rounded-md pr-2 pl-2">
                                                <button onClick={() => handleUpdateQuantity(item.ma_bien_the, item.so_luong - 1, currentStock)} className="border-r border-gray-300 w-1/4">-</button>
                                                <p className="flex items-center justify-center w-2/4">{item.so_luong}</p>
                                                <button onClick={() => handleUpdateQuantity(item.ma_bien_the, item.so_luong + 1, currentStock)} className="border-l border-gray-300 w-1/4">+</button>
                                            </div>

                                            <div className="text-orange-400 font-bold">
                                                {(item.so_luong * Number(item.don_gia ?? meta.don_gia ?? 2890000)).toLocaleString('vi-VN')} đ
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>

                        <div className="w-1/3 bg-white p-10 rounded-xl">
                            <p className="text-md font-bold">Tóm tắt đơn hàng</p>

                            <div className="mt-4 flex items-center justify-between">
                                <p>Tạm tính <span>{totalItems}</span> sp</p>
                                <p>{totalPrice.toLocaleString('vi-VN')} đ</p>
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                                <p>Phí vận chuyển</p>
                                <p className="font-bold text-md text-green-500">Miễn phí</p>
                            </div>

                            <div className="mt-2 border-t border-gray-100 text-md flex items-center justify-between">
                                <p className="font-bold">Tổng cộng</p>
                                <p className="text-orange-400 font-bold">{totalPrice.toLocaleString('vi-VN')} đ</p>
                            </div>

                            <div className="mt-4">
                                <form className="flex items-center gap-3 w-full" onSubmit={(e) => e.preventDefault()}>
                                    <input className="w-4/5 p-2 pr-3 pl-3 border border-gray-300 rounded-md" type="text" placeholder="Mã giảm giá" />
                                    <button className="w-1/5 bg-gray-100 hover:bg-gray-200 font-bold rounded-md p-2 pr-3 pl-3">Áp dụng</button>
                                </form>
                            </div>

                            {totalItems > 0 ? (
                                <Link to='/checkout' className="mt-4 rounded-xl w-full text-white bg-orange-500 flex items-center justify-center pr-3 pl-3 p-2">Tiến hành thanh toán</Link>
                            ) : (
                                <button disabled className="mt-4 rounded-xl w-full text-white bg-gray-400 flex items-center justify-center pr-3 pl-3 p-2 cursor-not-allowed">Tiến hành thanh toán</button>
                            )}
                            <Link to='/product' className="mt-4 text-gray-400 hover:text-orange-400 flex items-center justify-center">Tiếp tục mua sắm</Link>
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

export default Cart;