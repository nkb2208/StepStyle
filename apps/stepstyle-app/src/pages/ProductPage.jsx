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
            <div className="p-10 flex-1">
                <div className="mr-10 ml-10">
                    <p className='text-2xl font-bold'>{selectedCategoryName}</p>
                    <p className='text-gray-500'><span>{filteredProducts.length}</span> sản phẩm</p>
                </div>

                <div className='flex mt-10 mr-10 ml-10'>
                    <div className='w-1/6'>
                        <div className="bg-white p-5 rounded-2xl">
                            <p className="text-md font-bold">Danh mục</p>
                            <div className="p-1 grid grid-cols-1">
                                <button
                                    onClick={() => handleSelectCategory("all")}
                                    className={
                                        selectedCategory === "all"
                                            ? 'flex items-center justify-start transition duration-300 mt-4 p-2 pr-3 pl-3 bg-orange-400 text-white font-bold rounded-xl cursor-pointer'
                                            : 'flex items-center justify-start mt-4 p-2 pr-3 pl-3 font-bold rounded-xl hover:bg-gray-100 cursor-pointer'
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
                                                    ? 'flex items-center justify-start transition duration-300 mt-4 p-2 pr-3 pl-3 bg-orange-400 text-white font-bold rounded-xl cursor-pointer'
                                                    : 'flex items-center justify-start mt-4 p-2 pr-3 pl-3 font-bold rounded-xl hover:bg-gray-100 cursor-pointer'
                                            }
                                        >
                                            {cat.ten_danh_muc}
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="mt-6 text-md font-bold">Giá tối đa</p>
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

                    <div className='w-5/6'>
                        <div className="pr-10 pl-10 flex items-center gap-3">
                            <form className="w-5/6" onSubmit={(e) => e.preventDefault()}>
                                <div className="flex items-center">
                                    <div className="rounded-l-xl border-t border-b border-l border-gray-300 p-2 pr-3 pl-3 bg-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                    </div>
                                    <input
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full p-2 pr-3 pl-3 border-gray-300 rounded-r-xl border-r border-b border-t bg-white"
                                        type="text"
                                        placeholder="Tìm kiếm giày..."
                                    />
                                </div>
                            </form>
                            <div className="w-1/6">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-white rounded-xl border-orange-400 border p-2 pr-3 w-full"
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
