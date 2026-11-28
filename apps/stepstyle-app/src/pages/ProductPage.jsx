import NavBar from "../layouts/NavBar";
import AllProduct from "../pages/products/AllProduct";
import { useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Footer from "../layouts/Footer";
import {
    getPublicProducts,
    getPublicCategories,
    getEffectivePrice,
} from "../services/storefrontProductService";

function ProductPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialCategory = searchParams.get("category") || "all";

    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("popular");
    const [maxPrice, setMaxPrice] = useState(10000000);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const catFromUrl = searchParams.get("category") || "all";
        setSelectedCategory(catFromUrl);
    }, [searchParams]);

    useEffect(() => {
        let active = true;
        const loadData = async () => {
            try {
                setLoading(true);
                const [prodData, catData] = await Promise.all([
                    getPublicProducts(),
                    getPublicCategories(),
                ]);
                if (!active) return;
                setProducts(prodData);
                setCategories(catData);
                if (prodData.length > 0) {
                    const highest = Math.max(...prodData.map((p) => getEffectivePrice(p)));
                    setMaxPrice(Math.max(highest, 5000000));
                }
            } catch (error) {
                console.error("Lỗi tải danh sách sản phẩm:", error);
            } finally {
                if (active) setLoading(false);
            }
        };
        loadData();
        return () => {
            active = false;
        };
    }, []);

    const highestProductPrice = useMemo(() => {
        if (products.length === 0) return 10000000;
        return Math.max(...products.map((p) => getEffectivePrice(p)), 5000000);
    }, [products]);

    const handleSelectCategory = (catValue) => {
        setSelectedCategory(catValue);
        if (catValue === "all") {
            searchParams.delete("category");
            setSearchParams(searchParams);
        } else {
            setSearchParams({ category: String(catValue) });
        }
    };

    const filteredProducts = useMemo(() => {
        let list = [...products];

        if (selectedCategory !== "all") {
            const catId = Number(selectedCategory);
            list = list.filter((p) => Number(p.ma_danh_muc) === catId);
        }

        if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            list = list.filter(
                (p) =>
                    (p.ten_san_pham || "").toLowerCase().includes(q) ||
                    (p.danh_muc?.ten_danh_muc || "").toLowerCase().includes(q)
            );
        }

        list = list.filter((p) => getEffectivePrice(p) <= maxPrice);

        if (sortBy === "price_desc") {
            list.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
        } else if (sortBy === "price_asc") {
            list.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
        }

        return list;
    }, [products, selectedCategory, searchTerm, maxPrice, sortBy]);

    const selectedCategoryName =
        selectedCategory === "all"
            ? "Tất cả sản phẩm"
            : categories.find((c) => String(c.ma_danh_muc) === String(selectedCategory))?.ten_danh_muc ||
              "Tất cả sản phẩm";

    return (
        <div className="bg-gray-100 min-h-screen flex flex-col">
            {/* Nav Bar */}
            <div className="bg-white">
                <NavBar />
            </div>

            {/* Body */}
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 lg:px-10 py-6 sm:py-10 flex-1">
                <div>
                    <p className='text-2xl sm:text-3xl font-bold'>{selectedCategoryName}</p>
                    <p className='text-sm text-gray-500 mt-0.5'><span>{filteredProducts.length}</span> sản phẩm</p>
                </div>

                <div className='flex flex-col lg:flex-row gap-6 mt-6'>
                    <div className='w-full lg:w-64 shrink-0'>
                        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs">
                            <p className="text-base font-bold">Danh mục</p>
                            <div className="mt-3 flex flex-wrap lg:flex-col gap-2">
                                <button
                                    onClick={() => handleSelectCategory("all")}
                                    className={
                                        selectedCategory === "all"
                                            ? 'flex items-center justify-start transition duration-300 px-3 py-2 bg-orange-400 text-white text-sm font-bold rounded-xl cursor-pointer'
                                            : 'flex items-center justify-start px-3 py-2 text-sm font-bold rounded-xl bg-gray-50 lg:bg-transparent hover:bg-gray-100 cursor-pointer'
                                    }
                                >
                                    Tất cả
                                </button>

                                {categories.map((cat) => {
                                    const active = String(selectedCategory) === String(cat.ma_danh_muc);
                                    return (
                                        <button
                                            key={cat.ma_danh_muc}
                                            onClick={() => handleSelectCategory(String(cat.ma_danh_muc))}
                                            className={
                                                active
                                                    ? 'flex items-center justify-start transition duration-300 px-3 py-2 bg-orange-400 text-white text-sm font-bold rounded-xl cursor-pointer'
                                                    : 'flex items-center justify-start px-3 py-2 text-sm font-bold rounded-xl bg-gray-50 lg:bg-transparent hover:bg-gray-100 cursor-pointer'
                                            }
                                        >
                                            {cat.ten_danh_muc}
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="mt-5 text-base font-bold">Giá tối đa</p>
                            <div className="mt-2">
                                <input
                                    type="range"
                                    min={0}
                                    max={highestProductPrice}
                                    step={100000}
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                                    className="w-full accent-orange-400 cursor-pointer"
                                />
                                <p className="text-xs text-gray-600 mt-1 font-medium">
                                    Đến {maxPrice.toLocaleString("vi-VN")}đ
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='flex-1 min-w-0'>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <form className="flex-1" onSubmit={(e) => e.preventDefault()}>
                                <div className="flex items-center">
                                    <div className="rounded-l-xl border-t border-b border-l border-gray-300 px-3 py-2.5 bg-white text-gray-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                    </div>
                                    <input
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-3 py-2 text-sm sm:text-base border-gray-300 rounded-r-xl border-r border-b border-t bg-white outline-none focus:border-orange-400"
                                        type="text"
                                        placeholder="Tìm kiếm giày..."
                                    />
                                </div>
                            </form>
                            <div className="w-full sm:w-48 shrink-0">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-white rounded-xl border-orange-400 border px-3 py-2 text-sm sm:text-base w-full outline-none"
                                >
                                    <option value="popular">Phổ biến nhất</option>
                                    <option value="price_desc">Giá giảm dần</option>
                                    <option value="price_asc">Giá tăng dần</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <AllProduct products={filteredProducts} loading={loading} />
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default ProductPage;
