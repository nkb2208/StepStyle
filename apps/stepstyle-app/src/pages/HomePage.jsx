import { useEffect, useState } from 'react';
import Footer from '../layouts/Footer';
import { quickAddToCart } from '../utils/cartHelper';
import NavBar from '../layouts/NavBar';
import { Link, useNavigate } from 'react-router-dom';
import {
    getPublicProducts,
    getPublicCategories,
    getEffectivePrice,
    getDefaultVariant,
    FALLBACK_PRODUCT_IMAGE,
} from '../services/storefrontProductService';

const CATEGORY_IMAGES = [
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&fit=crop&auto=format',
    'https://media.istockphoto.com/id/1191174327/photo/fashion-model-wearing-jeans-and-brown-boots-with-zipper.jpg?s=612x612&w=0&k=20&c=oSPZltRJ6J1mGVFHHoUevqha47n0Ipaucr341OS7gRs=',
    'https://assets.woodland.social/product/images/FGC015050111A/CAMEL/FGC015050111A_010_0.webp',
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&fit=crop&auto=format',
];

function formatVnd(amount) {
    return `${Number(amount || 0).toLocaleString('vi-VN')}đ`;
}

function ProductCard({ product, onOpenDetail, onQuickAdd }) {
    const effectivePrice = getEffectivePrice(product);
    const origPrice = Number(product.gia_goc || 0);
    const hasDiscount = origPrice > 0 && effectivePrice < origPrice;
    const categoryName = product.danh_muc?.ten_danh_muc || 'StepStyle';
    const imageUrl = product.hinh_anh_dai_dien || FALLBACK_PRODUCT_IMAGE;

    return (
        <div
            onClick={() => onOpenDetail(product.ma_san_pham)}
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
                    {/* Category / Brand */}
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
                            {formatVnd(effectivePrice)}
                        </div>
                        {hasDiscount && (
                            <div className='text-xs text-gray-400 line-through'>
                                {formatVnd(origPrice)}
                            </div>
                        )}
                    </div>
                    <button
                        type='button'
                        onClick={(e) => {
                            e.stopPropagation();
                            onQuickAdd(product);
                        }}
                        className='shrink-0 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center px-3 py-1.5 text-sm text-white font-bold rounded-md'
                    >
                        + Giỏ
                    </button>
                </div>
            </div>
        </div>
    );
}

function HomePage() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const loadStorefront = async () => {
            try {
                const [prodData, catData] = await Promise.all([
                    getPublicProducts(),
                    getPublicCategories(),
                ]);
                if (!active) return;
                setProducts(prodData);
                setCategories(catData);
            } catch (error) {
                console.error('Lỗi tải dữ liệu trang chủ:', error);
            } finally {
                if (active) setLoading(false);
            }
        };
        loadStorefront();
        return () => {
            active = false;
        };
    }, []);

    const handleOpenDetail = (productId) => {
        navigate(`/detail/${productId}`);
    };

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

    const featuredProducts = products.slice(0, 10);
    const bestSellerProducts = products.length > 5 ? products.slice(0, 10) : products;

    return (
        <div className="relative min-h-screen">
            {/* Nav Bar */}
            <div className="">
                <NavBar />
            </div>

            {/* Body */}
            <div className="mt-10">
                {/* New Product */}
                <div className='pr-10 pl-10'>
                    <div className='mr-10 ml-10 w-fit p-3 rounded-xl flex items-center justify-center pt-1 pb-1 bg-orange-100 text-red-500 font-bold text-xs'>
                        <p>Bộ sưu tập mới 2025</p>
                    </div>

                    <div className='flex mt-4 mr-10 ml-10'>
                        <div className='md:w-1/2'>
                            <p className='text-8xl font-bold'>
                                Bước vào<br />
                                <span className='text-orange-500'>phong cách</span><br />
                                của bạn
                            </p>

                            <p className='mt-10 text-gray-500'>
                                Khám phá hàng nghìn đôi giày từ các thương hiệu hàng đầu thế giới. <br />Chính hãng, bảo hành, đổi trả dễ dàng.
                            </p>

                            <div className='mt-10 flex items-center gap-3'>
                                <Link to='/products' className='hover:bg-orange-500 bg-orange-400 p-4 pr-5 pl-5 text-white font-bold rounded-xl'>Mua sắm ngay</Link>
                                <Link to='/products' className='hover:border-gray-500 border border-gray-300 p-4 pr-5 pl-5 font-bold rounded-xl'>Xem bộ sưu tập</Link>
                            </div>

                            <div className='mt-10 flex item-center gap-3'>
                                <div className='border-r pr-4'>
                                    <p className='text-2xl font-bold'>10K+</p>
                                    <p className='text-xs text-gray-500 flex items-center justify-center'>Khách hàng</p>
                                </div>

                                <div className='border-r pr-4'>
                                    <p className='text-2xl font-bold'>{products.length > 0 ? `${products.length}+` : '500+'}</p>
                                    <p className='text-xs text-gray-500 flex items-center justify-center'>Mẫu giày</p>
                                </div>

                                <div className='pr-4'>
                                    <p className='text-2xl font-bold'>4.9/5</p>
                                    <p className='text-xs text-gray-500 flex items-center justify-center'>Đánh giá</p>
                                </div>
                            </div>
                        </div>

                        <div className='md:w-1/2'>
                            <img className='rounded-3xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                        </div>
                    </div>
                </div>

                <div className='bg-gray-50 mt-10'>
                    {/* List */}
                    <div className='mt-10 mr-10 ml-10 p-10'>
                        <p className='text-2xl font-bold'>Khám phá theo danh mục</p>
                        <div className='grid grid-cols-5 mt-4 gap-3'>
                            {categories.map((cat, idx) => (
                                <div
                                    key={cat.ma_danh_muc}
                                    onClick={() => navigate(`/products?category=${cat.ma_danh_muc}`)}
                                    style={{ backgroundImage: `url(${CATEGORY_IMAGES[idx % CATEGORY_IMAGES.length]})` }}
                                    className='hover:cursor-pointer hover:scale-105 transition duration-300 relative rounded-xl col-span-1 bg-cover bg-center flex items-end justify-start p-5 h-40 overflow-hidden'
                                >
                                    <div className="absolute hover:bg-black/20 transition duration-300 inset-0 bg-black/40 z-0"></div>
                                    <div className='relative z-10'>
                                        <p className='text-2xl font-bold text-white'>{cat.ten_danh_muc}</p>
                                        <p className='text-xs text-gray-200 line-clamp-1'>{cat.mo_ta || 'Khám phá ngay'}</p>
                                    </div>
                                </div>
                            ))}
                            {!loading && categories.length === 0 && (
                                <p className='col-span-5 text-sm text-gray-500'>Chưa có danh mục nào trong hệ thống.</p>
                            )}
                        </div>
                    </div>

                    {/* Hot Product */}
                    <div className='mt-10 p-10'>
                        <div className="w-full pr-10 flex items-center justify-between">
                            <p className='text-2xl font-bold pl-10 pr-10'>Nổi bật</p>
                            <Link className='text-md font-bold text-orange-400 hover:underline underline-offset-1' to='/products'>Xem tất cả</Link>
                        </div>

                        <div className='gap-4 mt-4 grid grid-cols-5 pl-10 pr-10'>
                            {loading ? (
                                <p className='col-span-5 text-center text-gray-500 py-8'>Đang tải sản phẩm...</p>
                            ) : featuredProducts.length === 0 ? (
                                <p className='col-span-5 text-center text-gray-500 py-8'>Chưa có sản phẩm nào.</p>
                            ) : (
                                featuredProducts.map((product) => (
                                    <ProductCard
                                        key={`featured-${product.ma_san_pham}`}
                                        product={product}
                                        onOpenDetail={handleOpenDetail}
                                        onQuickAdd={handleQuickAdd}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Discount */}
                    <div className='p-10'>
                        <div className='m-10 p-10 bg-orange-400 text-white rounded-2xl'>
                            <p className='font-bold'>Ưu đãi đặc biệt</p>

                            <div className='flex items-center justify-between mt-4'>
                                <p className='text-3xl font-bold'>
                                    Giảm đến 30% cho <br />
                                    Đơn hàng đầu tiên
                                </p>
                                <button
                                    type='button'
                                    onClick={() => navigate('/products')}
                                    className='bg-white text-orange-400 p-4 rounded-xl font-bold pr-5 pl-5 cursor-pointer'
                                >
                                    Mua ngay
                                </button>
                            </div>

                            <p className='mt-4'>Sử dụng mã: <span className='p-1 pl-2 pr-2 bg-orange-500 font-bold rounded-xl'>WELCOME30</span></p>
                        </div>
                    </div>

                    {/* Best Seller */}
                    <div className='p-10'>
                        <div className="w-full pr-10 flex items-center justify-between">
                            <p className='text-2xl font-bold pl-10 pr-10'>Bán chạy nhất</p>
                            <Link className='text-md font-bold text-orange-400 hover:underline underline-offset-1' to='/products'>Xem tất cả</Link>
                        </div>

                        <div className='gap-4 mt-4 grid grid-cols-5 pl-10 pr-10'>
                            {loading ? (
                                <p className='col-span-5 text-center text-gray-500 py-8'>Đang tải sản phẩm...</p>
                            ) : bestSellerProducts.length === 0 ? (
                                <p className='col-span-5 text-center text-gray-500 py-8'>Chưa có sản phẩm nào.</p>
                            ) : (
                                bestSellerProducts.map((product) => (
                                    <ProductCard
                                        key={`best-${product.ma_san_pham}`}
                                        product={product}
                                        onOpenDetail={handleOpenDetail}
                                        onQuickAdd={handleQuickAdd}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Store guarantees */}
                    <div className='bg-white'>
                        <div className='p-10 grid grid-cols-4 gap-3'>
                            <div className='col-span-1 flex items-center justify-center gap-3'>
                                <svg className='w-8 h-8' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="1" y="3" width="15" height="13"></rect>
                                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                </svg>
                                <div>
                                    <p className='font-bold'>Miễn phí vận chuyển</p>
                                    <p className='text-xs text-gray-500'>Cho đơn từ 500.000đ</p>
                                </div>
                            </div>

                            <div className='col-span-1 flex items-center justify-center gap-3'>
                                <svg className='w-8 h-8' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                </svg>
                                <div>
                                    <p className='font-bold'>Đổi trả dễ dàng</p>
                                    <p className='text-xs text-gray-500'>30 ngày không điều kiện</p>
                                </div>
                            </div>

                            <div className='col-span-1 flex items-center justify-center gap-3'>
                                <svg className='w-8 h-8' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <div>
                                    <p className='font-bold'>Hàng chính hãng</p>
                                    <p className='text-xs text-gray-500'>100% xác thực</p>
                                </div>
                            </div>

                            <div className='col-span-1 flex items-center justify-center gap-3'>
                                <svg className='w-8 h-8' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                </svg>
                                <div>
                                    <p className='font-bold'>Thanh toán an toàn</p>
                                    <p className='text-xs text-gray-500'>Mã hóa SSL</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
}

export default HomePage;
