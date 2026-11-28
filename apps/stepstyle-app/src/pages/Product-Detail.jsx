import { useEffect, useMemo, useState } from "react";
import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import { Link, useNavigate, useParams } from "react-router-dom";
import AllProduct from "./products/AllProduct";
import { quickAddToCart, showToast } from "../utils/cartHelper";
import {
    getPublicProductById,
    getPublicProducts,
    getEffectivePrice,
    FALLBACK_PRODUCT_IMAGE,
} from "../services/storefrontProductService";

function ProDuctDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [selectedColor, setSelectedColor] = useState("");
    const [selectedSize, setSelectedSize] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        let active = true;

        const loadProduct = async () => {
            try {
                setFetching(true);
                setNotFound(false);

                const allProducts = await getPublicProducts();
                let current = null;

                if (id) {
                    current = await getPublicProductById(id);
                } else if (allProducts.length > 0) {
                    current = allProducts[0];
                }

                if (!active) return;

                if (!current) {
                    setNotFound(true);
                    setProduct(null);
                    return;
                }

                setProduct(current);
                setQuantity(1);

                const variants = current.danh_sach_bien_the || [];
                const firstAvail = variants.find((v) => Number(v.so_luong_kho) > 0) || variants[0];
                setSelectedColor(firstAvail?.mau_sac || "");
                setSelectedSize(firstAvail?.kich_co || "");

                setRelatedProducts(
                    allProducts
                        .filter((p) => Number(p.ma_san_pham) !== Number(current.ma_san_pham))
                        .slice(0, 4)
                );
            } catch (error) {
                console.error("Lỗi tải chi tiết sản phẩm:", error);
                if (active) setNotFound(true);
            } finally {
                if (active) setFetching(false);
            }
        };

        loadProduct();
        return () => {
            active = false;
        };
    }, [id]);

    const variants = useMemo(() => product?.danh_sach_bien_the || [], [product]);

    const colors = useMemo(() => {
        return [...new Set(variants.map((v) => v.mau_sac).filter(Boolean))];
    }, [variants]);

    const sizesForColor = useMemo(() => {
        const filtered = selectedColor
            ? variants.filter((v) => v.mau_sac === selectedColor)
            : variants;
        return [...new Set(filtered.map((v) => v.kich_co).filter(Boolean))];
    }, [variants, selectedColor]);

    const selectedVariant = useMemo(() => {
        if (variants.length === 0) return null;
        return (
            variants.find(
                (v) =>
                    (!selectedColor || v.mau_sac === selectedColor) &&
                    (!selectedSize || String(v.kich_co) === String(selectedSize))
            ) ||
            variants.find((v) => v.mau_sac === selectedColor) ||
            variants[0]
        );
    }, [variants, selectedColor, selectedSize]);

    const handleSelectColor = (colorVal) => {
        setSelectedColor(colorVal);
        const matchingVariants = variants.filter((v) => v.mau_sac === colorVal);
        const stillValid = matchingVariants.some(
            (v) => String(v.kich_co) === String(selectedSize)
        );
        if (!stillValid && matchingVariants.length > 0) {
            setSelectedSize(matchingVariants[0].kich_co || "");
        }
        setQuantity(1);
    };

    const maxStock = selectedVariant ? Number(selectedVariant.so_luong_kho || 0) : 0;

    const handleIncreaseQuantity = () => {
        setQuantity((prev) => (maxStock > 0 ? Math.min(prev + 1, maxStock) : prev + 1));
    };

    const handleReduceQuantity = () => {
        setQuantity((prev) => (prev <= 1 ? 1 : prev - 1));
    };

    const effectivePrice = getEffectivePrice(product);
    const origPrice = Number(product?.gia_goc || 0);
    const hasDiscount = origPrice > 0 && effectivePrice < origPrice;
    const discountPercent = hasDiscount
        ? Math.round(((origPrice - effectivePrice) / origPrice) * 100)
        : 0;

    const displayImage =
        selectedVariant?.hinh_anh_bien_the ||
        product?.hinh_anh_dai_dien ||
        FALLBACK_PRODUCT_IMAGE;

    const handleAddToCart = async () => {
        if (!product) return false;
        if (!selectedVariant) {
            showToast("Sản phẩm hiện chưa có biến thể để đặt mua!", "error");
            return false;
        }
        if (maxStock <= 0) {
            showToast("Biến thể này hiện đã hết hàng!", "error");
            return false;
        }

        try {
            setLoading(true);
            const result = await quickAddToCart(
                {
                    ma_san_pham: product.ma_san_pham,
                    ma_bien_the: selectedVariant.ma_bien_the,
                    ten_san_pham: product.ten_san_pham,
                    thuong_hieu: product.danh_muc?.ten_danh_muc || "StepStyle",
                    don_gia: effectivePrice,
                    kich_co: String(selectedVariant.kich_co || "38"),
                    mau_sac: selectedVariant.mau_sac || "Trắng",
                    hinh_anh: displayImage,
                },
                quantity
            );
            return Boolean(result);
        } catch (error) {
            console.error("Lỗi thêm giỏ hàng:", error);
            showToast("Có lỗi xảy ra!", "error");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleBuyNow = async () => {
        const ok = await handleAddToCart();
        if (ok) navigate("/cart");
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            <div>
                <NavBar />
            </div>

            {/* Body */}
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 lg:px-10 py-6 sm:py-10 flex-1">
                {fetching ? (
                    <div className="py-20 text-center text-gray-500">
                        Đang tải thông tin sản phẩm...
                    </div>
                ) : notFound || !product ? (
                    <div className="py-20 px-4 text-center bg-white rounded-2xl">
                        <p className="text-xl font-bold text-gray-800">Không tìm thấy sản phẩm</p>
                        <Link
                            to="/products"
                            className="inline-block mt-4 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold"
                        >
                            Quay lại danh sách sản phẩm
                        </Link>
                    </div>
                ) : (
                    <>
                        <p className="text-xs sm:text-sm text-gray-500 break-words">
                            <Link to="/home" className="hover:underline">Trang chủ</Link> /{" "}
                            <Link to="/products" className="hover:underline">Sản phẩm</Link> /{" "}
                            <span className="text-black font-medium">{product.ten_san_pham}</span>
                        </p>

                        <div className="mt-4 flex flex-col lg:flex-row gap-6 bg-white p-4 sm:p-6 rounded-2xl">
                            <div className="w-full lg:w-1/2">
                                <img
                                    className="rounded-xl w-full h-72 sm:h-96 lg:h-[460px] object-cover"
                                    src={displayImage}
                                    alt={product.ten_san_pham}
                                    onError={(e) => {
                                        e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                                    }}
                                />
                            </div>

                            <div className="w-full lg:w-1/2 lg:px-5">
                                {/* Category */}
                                <p className="px-3 py-1 bg-blue-100 text-blue-500 w-fit rounded-xl font-bold text-xs sm:text-sm">
                                    {product.danh_muc?.ten_danh_muc || "StepStyle"}
                                </p>

                                {/* Product name */}
                                <p className="text-2xl sm:text-3xl font-bold mt-3 sm:mt-4">{product.ten_san_pham}</p>

                                {/* Rating */}
                                <div className="flex items-center gap-3 mt-2">
                                    <svg className="w-20 sm:w-24 h-4 sm:h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 24" fill="#FFC107">
                                        <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                        <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                        <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                        <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                        <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                    </svg>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-bold text-black">4.8</span> ({variants.length} phiên bản)
                                    </p>
                                </div>

                                {/* Price */}
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4">
                                    <p className="text-2xl sm:text-4xl font-bold text-orange-500">
                                        {effectivePrice.toLocaleString("vi-VN")}đ
                                        {hasDiscount && (
                                            <span className="ml-2 sm:ml-3 text-base sm:text-xl text-gray-400 line-through">
                                                {origPrice.toLocaleString("vi-VN")}đ
                                            </span>
                                        )}
                                    </p>

                                    {hasDiscount && (
                                        <p className="px-2 py-1 bg-orange-100 text-orange-500 w-fit rounded-xl font-bold text-xs sm:text-sm">
                                            -{discountPercent}%
                                        </p>
                                    )}
                                </div>

                                {/* Color */}
                                <div className="mt-5">
                                    <p className="font-bold text-sm sm:text-base">
                                        Màu sắc:
                                        <span className="ml-2 text-orange-500">
                                            {selectedColor || "Chưa có màu"}
                                        </span>
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2 sm:gap-3 items-center">
                                        {colors.length === 0 ? (
                                            <span className="text-sm text-gray-400">Chưa có biến thể màu</span>
                                        ) : (
                                            colors.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => handleSelectColor(c)}
                                                    className={
                                                        selectedColor === c
                                                            ? "border border-orange-500 rounded-xl bg-orange-400 px-3.5 py-2 text-sm sm:text-base text-white font-bold cursor-pointer"
                                                            : "font-bold border border-gray-300 rounded-xl px-3.5 py-2 text-sm sm:text-base hover:border-orange-400 cursor-pointer"
                                                    }
                                                >
                                                    {c}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Size */}
                                <div className="mt-5">
                                    <p className="font-bold text-sm sm:text-base">
                                        Size:
                                        <span className="ml-2 text-orange-500">
                                            {selectedSize || "Chưa có size"}
                                        </span>
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2 sm:gap-3 items-center">
                                        {sizesForColor.length === 0 ? (
                                            <span className="text-sm text-gray-400">Chưa có biến thể size</span>
                                        ) : (
                                            sizesForColor.map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedSize(s);
                                                        setQuantity(1);
                                                    }}
                                                    className={
                                                        String(selectedSize) === String(s)
                                                            ? "border border-orange-500 rounded-xl bg-orange-400 px-3.5 py-2 text-sm sm:text-base text-white font-bold cursor-pointer"
                                                            : "font-bold border border-gray-300 rounded-xl px-3.5 py-2 text-sm sm:text-base hover:border-orange-400 cursor-pointer"
                                                    }
                                                >
                                                    {s}
                                                </button>
                                            ))
                                        )}
                                    </div>

                                    {/* Quantity */}
                                    <div className="mt-5 flex flex-wrap items-center gap-3">
                                        <p className="font-bold text-sm sm:text-base">Số lượng:</p>

                                        <div className="w-28 flex items-center gap-2 border border-gray-300 rounded-md p-2 font-bold">
                                            <button type="button" onClick={handleReduceQuantity} className="border-r w-1/4 cursor-pointer">-</button>
                                            <p className="flex items-center justify-center w-2/4">{quantity}</p>
                                            <button type="button" onClick={handleIncreaseQuantity} className="border-l w-1/4 cursor-pointer">+</button>
                                        </div>

                                        <p className="text-gray-500 text-sm">
                                            {selectedVariant
                                                ? maxStock > 0
                                                    ? `Còn ${maxStock} sản phẩm`
                                                    : "Hết hàng"
                                                : "Chưa có biến thể"}
                                        </p>
                                    </div>

                                    {/* Btn add to cart and purchase */}
                                    <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={handleAddToCart}
                                            disabled={loading || !selectedVariant || maxStock <= 0}
                                            className="w-full sm:w-1/2 bg-orange-500 rounded-xl hover:bg-orange-600 text-white font-bold text-base sm:text-lg py-3.5 px-4 disabled:opacity-50 cursor-pointer"
                                        >
                                            Thêm vào giỏ hàng
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleBuyNow}
                                            disabled={loading || !selectedVariant || maxStock <= 0}
                                            className="w-full sm:w-1/2 text-orange-500 border border-orange-500 font-bold text-base sm:text-lg py-3.5 px-4 rounded-xl hover:bg-orange-50 disabled:opacity-50 cursor-pointer"
                                        >
                                            Mua ngay
                                        </button>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mt-6 border-t pt-4">
                                    <p className="font-bold mb-1">Mô tả sản phẩm</p>
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                        {product.mo_ta || "Chưa có mô tả chi tiết cho sản phẩm này."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {relatedProducts.length > 0 && (
                            <div className="mt-8">
                                <p className="text-xl sm:text-2xl font-bold mb-2">Sản phẩm liên quan</p>
                                <div>
                                    <AllProduct products={relatedProducts} loading={false} />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="mt-auto">
                <Footer />
            </div>
        </div>
    );
}

export default ProDuctDetail;
