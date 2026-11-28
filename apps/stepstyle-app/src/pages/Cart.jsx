import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import {
    loadActiveCart,
    updateActiveCartItem,
    removeActiveCartItem,
    switchActiveCartVariant,
    saveVariantMetadata,
    showToast,
} from "../utils/cartHelper";
import {
    getPublicProducts,
    getEffectivePrice,
    FALLBACK_PRODUCT_IMAGE,
} from "../services/storefrontProductService";

function Cart() {
    const [cart, setCart] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingVariantId, setUpdatingVariantId] = useState(null);
    const [metadata, setMetadata] = useState(() => {
        try {
            const stored = localStorage.getItem("variant_metadata");
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    // Ánh xạ ma_bien_the -> { product, variant } từ dữ liệu thực trong DB
    const variantLookup = useMemo(() => {
        const map = {};
        for (const product of products) {
            const variants = product.danh_sach_bien_the || [];
            for (const variant of variants) {
                map[Number(variant.ma_bien_the)] = { product, variant };
            }
        }
        return map;
    }, [products]);

    const loadCartAndCatalog = async () => {
        try {
            setLoading(true);
            const [cartRes, prodList] = await Promise.all([
                loadActiveCart(),
                getPublicProducts().catch((err) => {
                    console.error("Lỗi tải danh sách sản phẩm từ DB:", err);
                    return [];
                }),
            ]);

            if (Array.isArray(prodList)) {
                setProducts(prodList);
                // Đồng bộ lại metadata localStorage theo dữ liệu mới nhất từ DB
                const freshMap = {};
                for (const p of prodList) {
                    const price = getEffectivePrice(p);
                    const categoryName = p.danh_muc?.ten_danh_muc || "StepStyle";
                    for (const v of p.danh_sach_bien_the || []) {
                        freshMap[Number(v.ma_bien_the)] = {
                            ma_san_pham: p.ma_san_pham,
                            ten_san_pham: p.ten_san_pham,
                            thuong_hieu: categoryName,
                            don_gia: price,
                            kich_co: String(v.kich_co || ""),
                            mau_sac: v.mau_sac || "",
                            hinh_anh: v.hinh_anh_bien_the || p.hinh_anh_dai_dien || FALLBACK_PRODUCT_IMAGE,
                        };
                    }
                }
                if (Object.keys(freshMap).length > 0) {
                    setMetadata((prev) => {
                        const merged = { ...prev, ...freshMap };
                        localStorage.setItem("variant_metadata", JSON.stringify(merged));
                        return merged;
                    });
                }
            }

            if (cartRes && cartRes.data) setCart(cartRes.data);
            else setCart(null);
        } catch (error) {
            console.error("Lỗi lấy giỏ hàng:", error);
        } finally {
            setLoading(false);
        }
    };

    const reloadCartOnly = async () => {
        try {
            const cartRes = await loadActiveCart();
            if (cartRes && cartRes.data) setCart(cartRes.data);
            else setCart(null);
        } catch (error) {
            console.error("Lỗi tải lại giỏ hàng:", error);
        }
    };

    useEffect(() => {
        loadCartAndCatalog();
    }, []);

    const getItemInfo = (item) => {
        const variantId = Number(item.ma_bien_the);
        const dbEntry = variantLookup[variantId];
        const fallbackMeta = metadata[variantId] || {};

        if (dbEntry) {
            const { product, variant } = dbEntry;
            const variants = product.danh_sach_bien_the || [];
            const colors = [...new Set(variants.map((v) => v.mau_sac).filter(Boolean))];
            const currentColor = variant.mau_sac || colors[0] || "";
            const sizesForColor = variants.filter((v) => !currentColor || v.mau_sac === currentColor);
            const effectivePrice = getEffectivePrice(product);

            return {
                ma_san_pham: product.ma_san_pham,
                ten_san_pham: product.ten_san_pham,
                thuong_hieu: product.danh_muc?.ten_danh_muc || "StepStyle",
                don_gia: effectivePrice,
                kich_co: String(variant.kich_co || ""),
                mau_sac: currentColor,
                so_luong_kho: Number(variant.so_luong_kho ?? 0),
                hinh_anh: variant.hinh_anh_bien_the || product.hinh_anh_dai_dien || FALLBACK_PRODUCT_IMAGE,
                colors,
                sizesForColor,
                allVariants: variants,
                hasDbData: true,
            };
        }

        return {
            ma_san_pham: item.ma_san_pham || fallbackMeta.ma_san_pham || 1,
            ten_san_pham: item.ten_san_pham || fallbackMeta.ten_san_pham || `Sản phẩm #${variantId}`,
            thuong_hieu: item.thuong_hieu || fallbackMeta.thuong_hieu || "StepStyle",
            don_gia: Number(item.don_gia ?? fallbackMeta.don_gia ?? 0),
            kich_co: String(item.kich_co || fallbackMeta.kich_co || ""),
            mau_sac: item.mau_sac || fallbackMeta.mau_sac || "",
            so_luong_kho: 0,
            hinh_anh: item.hinh_anh || fallbackMeta.hinh_anh || FALLBACK_PRODUCT_IMAGE,
            colors: [],
            sizesForColor: [],
            allVariants: [],
            hasDbData: false,
        };
    };

    const handleUpdateQuantity = async (item, newQty, maxStock) => {
        if (newQty < 1) return;
        if (maxStock > 0 && newQty > maxStock) {
            showToast(`Chỉ còn ${maxStock} sản phẩm trong kho!`, "error");
            return;
        }
        try {
            setUpdatingVariantId(item.ma_bien_the);
            const info = getItemInfo(item);
            await updateActiveCartItem(item.ma_bien_the, newQty, {
                kich_co: info.kich_co,
                mau_sac: info.mau_sac,
            });
            await reloadCartOnly();
        } catch (error) {
            console.error("Lỗi cập nhật số lượng:", error);
            showToast(error?.response?.data?.message || "Không thể cập nhật số lượng!", "error");
        } finally {
            setUpdatingVariantId(null);
        }
    };

    const handleChangeColor = async (item, info, newColor) => {
        const candidates = info.allVariants.filter((v) => v.mau_sac === newColor);
        if (candidates.length === 0) return;

        // Ưu tiên giữ nguyên size cũ nếu còn hàng, ngược lại chọn size đầu tiên còn hàng của màu mới
        const targetVariant =
            candidates.find((v) => String(v.kich_co) === String(info.kich_co) && Number(v.so_luong_kho) > 0) ||
            candidates.find((v) => Number(v.so_luong_kho) > 0) ||
            candidates[0];

        if (!targetVariant || Number(targetVariant.so_luong_kho) <= 0) {
            showToast("Màu này hiện đã hết hàng!", "error");
            return;
        }

        await applyVariantSwitch(item, info, targetVariant);
    };

    const handleChangeSize = async (item, info, targetVariantId) => {
        const targetVariant = info.allVariants.find(
            (v) => Number(v.ma_bien_the) === Number(targetVariantId)
        );
        if (!targetVariant) return;
        if (Number(targetVariant.so_luong_kho) <= 0) {
            showToast("Size này hiện đã hết hàng!", "error");
            return;
        }

        await applyVariantSwitch(item, info, targetVariant);
    };

    const applyVariantSwitch = async (item, info, targetVariant) => {
        if (Number(targetVariant.ma_bien_the) === Number(item.ma_bien_the)) return;

        const targetStock = Number(targetVariant.so_luong_kho || 0);
        const targetPayload = {
            ma_san_pham: info.ma_san_pham,
            ma_bien_the: Number(targetVariant.ma_bien_the),
            ten_san_pham: info.ten_san_pham,
            thuong_hieu: info.thuong_hieu,
            don_gia: info.don_gia,
            kich_co: String(targetVariant.kich_co || ""),
            mau_sac: targetVariant.mau_sac || "",
            hinh_anh: targetVariant.hinh_anh_bien_the || info.hinh_anh || FALLBACK_PRODUCT_IMAGE,
        };

        try {
            setUpdatingVariantId(item.ma_bien_the);
            saveVariantMetadata(targetPayload);
            await switchActiveCartVariant(
                item.ma_bien_the,
                targetPayload,
                Math.min(item.so_luong, targetStock),
                targetStock
            );
            await reloadCartOnly();
        } catch (error) {
            console.error("Lỗi đổi phân loại:", error);
            showToast(error?.response?.data?.message || "Không thể đổi phân loại sản phẩm!", "error");
        } finally {
            setUpdatingVariantId(null);
        }
    };

    const handleRemoveItem = async (variantId) => {
        try {
            setUpdatingVariantId(variantId);
            await removeActiveCartItem(variantId);
            await reloadCartOnly();
        } catch (error) {
            console.error("Lỗi xóa:", error);
        } finally {
            setUpdatingVariantId(null);
        }
    };

    const totalItems = cart?.items?.reduce((acc, item) => acc + Number(item.so_luong || 0), 0) || 0;
    const totalPrice =
        cart?.items?.reduce((acc, item) => {
            const info = getItemInfo(item);
            return acc + Number(item.so_luong || 0) * Number(info.don_gia || 0);
        }, 0) || 0;

    return (
        <div className="bg-gray-100 flex flex-col min-h-screen">
            <div>
                <NavBar />
            </div>

            {/* Body */}
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 lg:px-10 py-6 sm:py-10 flex-1">
                <div>
                    <p className="text-2xl sm:text-3xl font-bold">
                        Giỏ hàng <span className="text-orange-400">- {cart?.items?.length || 0} sản phẩm</span>
                    </p>

                    <div className="gap-4 sm:gap-6 flex flex-col lg:flex-row mt-4 sm:mt-6">
                        <div className="w-full lg:w-2/3 flex flex-col gap-4">
                            {loading ? (
                                <p className="bg-white rounded-xl p-6 text-gray-500">Đang tải...</p>
                            ) : !cart || !cart.items || cart.items.length === 0 ? (
                                <p className="bg-white rounded-xl p-6 text-gray-500">Giỏ hàng trống</p>
                            ) : (
                                cart.items.map((item) => {
                                    const info = getItemInfo(item);
                                    const isBusy = updatingVariantId === item.ma_bien_the;

                                    return (
                                        <div
                                            key={item.ma_bien_the}
                                            className={`p-3 sm:p-4 bg-white rounded-xl flex gap-3 sm:gap-4 w-full items-start shadow-2xs ${isBusy ? "opacity-70" : ""}`}
                                        >
                                            <Link to={`/detail/${info.ma_san_pham}`} className="shrink-0">
                                                <img
                                                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover"
                                                    src={info.hinh_anh}
                                                    alt={info.ten_san_pham}
                                                    onError={(e) => {
                                                        e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                                                    }}
                                                />
                                            </Link>

                                            <div className="flex-1 min-w-0">
                                                <div>
                                                    <div className="w-full flex items-center justify-between gap-2">
                                                        <p className="font-bold text-xs text-blue-500 truncate">
                                                            {info.thuong_hieu}
                                                        </p>
                                                        <button
                                                            disabled={isBusy}
                                                            className="hover:cursor-pointer shrink-0 p-1 disabled:opacity-50"
                                                            onClick={() => handleRemoveItem(item.ma_bien_the)}
                                                            aria-label="Xóa sản phẩm"
                                                        >
                                                            <svg className="text-gray-500 hover:text-red-500 w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M3 6h18" />
                                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                                <line x1="14" y1="11" x2="14" y2="17" />
                                                            </svg>
                                                        </button>
                                                    </div>

                                                    <Link
                                                        to={`/detail/${info.ma_san_pham}`}
                                                        className="font-bold text-sm sm:text-base line-clamp-2 hover:text-orange-500 transition"
                                                    >
                                                        {info.ten_san_pham}
                                                    </Link>

                                                    <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-600">
                                                        {info.hasDbData && info.colors.length > 0 ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-semibold text-gray-500">Màu:</span>
                                                                <select
                                                                    disabled={isBusy}
                                                                    value={info.mau_sac}
                                                                    onChange={(e) => handleChangeColor(item, info, e.target.value)}
                                                                    className="border border-gray-300 rounded-lg px-2 py-1 bg-gray-50 hover:border-orange-400 focus:border-orange-500 focus:outline-none font-medium text-gray-800 cursor-pointer"
                                                                >
                                                                    {info.colors.map((color) => (
                                                                        <option key={color} value={color}>
                                                                            {color}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            info.mau_sac && <span>Màu: <b>{info.mau_sac}</b></span>
                                                        )}

                                                        {info.hasDbData && info.sizesForColor.length > 0 ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-semibold text-gray-500">Size:</span>
                                                                <select
                                                                    disabled={isBusy}
                                                                    value={item.ma_bien_the}
                                                                    onChange={(e) => handleChangeSize(item, info, e.target.value)}
                                                                    className="border border-gray-300 rounded-lg px-2 py-1 bg-gray-50 hover:border-orange-400 focus:border-orange-500 focus:outline-none font-medium text-gray-800 cursor-pointer max-w-[160px]"
                                                                >
                                                                    {info.sizesForColor.map((v) => {
                                                                        const stock = Number(v.so_luong_kho ?? 0);
                                                                        return (
                                                                            <option
                                                                                key={v.ma_bien_the}
                                                                                value={v.ma_bien_the}
                                                                                disabled={stock <= 0 && Number(v.ma_bien_the) !== Number(item.ma_bien_the)}
                                                                            >
                                                                                Size {v.kich_co} {stock > 0 ? `(Còn ${stock})` : "(Hết hàng)"}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            info.kich_co && <span>Size: <b>{info.kich_co}</b></span>
                                                        )}

                                                        {info.hasDbData && (
                                                            <span
                                                                className={`px-2 py-0.5 rounded-md font-medium ${
                                                                    info.so_luong_kho > 0
                                                                        ? "text-green-600 bg-green-50"
                                                                        : "text-red-500 bg-red-50"
                                                                }`}
                                                            >
                                                                {info.so_luong_kho > 0
                                                                    ? `Còn ${info.so_luong_kho} sp`
                                                                    : "Hết hàng"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-2 w-full">
                                                    <div className="w-24 flex items-center gap-1 border border-gray-300 rounded-md px-1 py-1">
                                                        <button
                                                            type="button"
                                                            disabled={isBusy || item.so_luong <= 1}
                                                            onClick={() => handleUpdateQuantity(item, item.so_luong - 1, info.so_luong_kho)}
                                                            className="border-r border-gray-300 w-1/3 cursor-pointer disabled:opacity-40"
                                                        >
                                                            -
                                                        </button>
                                                        <p className="flex items-center justify-center w-1/3 text-sm font-medium">
                                                            {item.so_luong}
                                                        </p>
                                                        <button
                                                            type="button"
                                                            disabled={isBusy || (info.hasDbData && item.so_luong >= info.so_luong_kho)}
                                                            onClick={() => handleUpdateQuantity(item, item.so_luong + 1, info.so_luong_kho)}
                                                            className="border-l border-gray-300 w-1/3 cursor-pointer disabled:opacity-40"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    <div className="text-orange-400 font-bold text-sm sm:text-base">
                                                        {(Number(item.so_luong || 0) * Number(info.don_gia || 0)).toLocaleString("vi-VN")} đ
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="w-full lg:w-1/3 bg-white p-5 sm:p-8 rounded-xl h-fit shadow-2xs">
                            <p className="text-base font-bold">Tóm tắt đơn hàng</p>

                            <div className="mt-4 flex items-center justify-between text-sm sm:text-base">
                                <p>
                                    Tạm tính <span>{totalItems}</span> sp
                                </p>
                                <p>{totalPrice.toLocaleString("vi-VN")} đ</p>
                            </div>

                            <div className="mt-2 flex items-center justify-between text-sm sm:text-base">
                                <p>Phí vận chuyển</p>
                                <p className="font-bold text-green-500">Miễn phí</p>
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-100 text-base flex items-center justify-between">
                                <p className="font-bold">Tổng cộng</p>
                                <p className="text-orange-400 font-bold">{totalPrice.toLocaleString("vi-VN")} đ</p>
                            </div>

                            <div className="mt-4">
                                <form className="flex items-center gap-2 w-full" onSubmit={(e) => e.preventDefault()}>
                                    <input
                                        className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-orange-400"
                                        type="text"
                                        placeholder="Mã giảm giá"
                                    />
                                    <button className="shrink-0 bg-gray-100 hover:bg-gray-200 font-bold rounded-md px-3 py-2 text-sm whitespace-nowrap cursor-pointer">
                                        Áp dụng
                                    </button>
                                </form>
                            </div>

                            {totalItems > 0 ? (
                                <Link
                                    to="/checkout"
                                    className="mt-4 rounded-xl w-full text-white bg-orange-500 hover:bg-orange-600 font-bold flex items-center justify-center px-4 py-3 transition"
                                >
                                    Tiến hành thanh toán
                                </Link>
                            ) : (
                                <button
                                    disabled
                                    className="mt-4 rounded-xl w-full text-white bg-gray-400 font-bold flex items-center justify-center px-4 py-3 cursor-not-allowed"
                                >
                                    Tiến hành thanh toán
                                </button>
                            )}
                            <Link
                                to="/products"
                                className="mt-4 text-sm text-gray-500 hover:text-orange-400 flex items-center justify-center"
                            >
                                Tiếp tục mua sắm
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto">
                <Footer />
            </div>
        </div>
    );
}

export default Cart;
