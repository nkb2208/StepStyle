import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quickAddToCart } from '../../utils/cartHelper';
import {
    getPublicProducts,
    getEffectivePrice,
    getDefaultVariant,
    FALLBACK_PRODUCT_IMAGE,
} from '../../services/storefrontProductService';

function AllProduct({ products: propProducts, loading: propLoading }) {
    const navigate = useNavigate();
    const [fetchedProducts, setFetchedProducts] = useState([]);
    const [internalLoading, setInternalLoading] = useState(propProducts === undefined);

    useEffect(() => {
        if (propProducts !== undefined) return;
        let active = true;
        const load = async () => {
            try {
                setInternalLoading(true);
                const data = await getPublicProducts();
                if (active) setFetchedProducts(data);
            } catch (error) {
                console.error('Lỗi tải danh sách sản phẩm:', error);
            } finally {
                if (active) setInternalLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [propProducts]);

    const products = propProducts !== undefined ? propProducts : fetchedProducts;
    const loading = propProducts !== undefined ? Boolean(propLoading) : internalLoading;

    const handleQuickAdd = (product) => {
        const variant = getDefaultVariant(product);
        if (!variant) {
            navigate(`/detail/${product.ma_san_pham}`);
            return;
        }
        const effectivePrice = getEffectivePrice(product);
        quickAddToCart({
            ma_san_pham: product.ma_san_pham,
            ma_bien_the: variant.ma_bien_the,
            ten_san_pham: product.ten_san_pham,
            thuong_hieu: product.danh_muc?.ten_danh_muc || 'StepStyle',
            don_gia: effectivePrice,
            kich_co: variant.kich_co || '38',
            mau_sac: variant.mau_sac || 'Trắng',
            hinh_anh: variant.hinh_anh_bien_the || product.hinh_anh_dai_dien || FALLBACK_PRODUCT_IMAGE,
        });
    };

    if (loading) {
        return (
            <div className='mt-8 text-center text-gray-500 py-10'>
                Đang tải sản phẩm...
            </div>
        );
    }

    if (!products || products.length === 0) {
        return (
            <div className='mt-8 text-center text-gray-500 py-10 bg-white rounded-xl mx-10'>
                Không tìm thấy sản phẩm phù hợp.
            </div>
        );
    }

    return (
        <div className='gap-4 mt-4 grid grid-cols-4 pl-10 pr-10'>
            {products.map((product) => {
                const effectivePrice = getEffectivePrice(product);
                const origPrice = Number(product.gia_goc || 0);
                const hasDiscount = origPrice > 0 && effectivePrice < origPrice;
                const categoryName = product.danh_muc?.ten_danh_muc || 'StepStyle';
                const imageUrl = product.hinh_anh_dai_dien || FALLBACK_PRODUCT_IMAGE;

                return (
                    <div
                        key={product.ma_san_pham}
                        onClick={() => navigate(`/detail/${product.ma_san_pham}`)}
                        className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white cursor-pointer flex flex-col overflow-hidden'
                    >
                        <img
                            className='rounded-t-xl w-full h-48 object-cover'
                            src={imageUrl}
                            alt={product.ten_san_pham}
                            onError={(e) => {
                                e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                            }}
                        />
                        <div className='mt-2 p-3 flex flex-col flex-1 justify-between'>
                            <div>
                                {/* Brand / Category */}
                                <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-fit px-2.5 py-1'>
                                    {categoryName}
                                </p>
                                <div className='mt-3'>
                                    {/* Product Name */}
                                    <p className='font-medium text-gray-900 line-clamp-2 min-h-[2.5rem]'>
                                        {product.ten_san_pham}
                                    </p>
                                    {/* Rate */}
                                    <div className='flex items-center gap-2 mt-1'>
                                        <svg className='w-16 h-4' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 24" fill="#FFC107">
                                            <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                        </svg>
                                        <p className='text-xs text-gray-500'>
                                            ({product.danh_sach_bien_the?.length || 0} phiên bản)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Price and button add to cart */}
                            <div className='mt-4 flex items-center justify-between gap-2'>
                                <div className='min-w-0'>
                                    <div className='text-lg font-bold text-orange-400 truncate'>
                                        {effectivePrice.toLocaleString('vi-VN')}đ
                                    </div>
                                    {hasDiscount && (
                                        <div className='text-xs text-gray-400 line-through'>
                                            {origPrice.toLocaleString('vi-VN')}đ
                                        </div>
                                    )}
                                </div>
                                <button
                                    type='button'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickAdd(product);
                                    }}
                                    className='shrink-0 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center px-3 py-1.5 text-sm text-white font-bold rounded-md'
                                >
                                    + Giỏ
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default AllProduct;
