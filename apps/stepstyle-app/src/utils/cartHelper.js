import { addToCart } from "../services/orderApiService";

export const quickAddToCart = async (product) => {
    try {
        const userId = localStorage.getItem("userId") || 1;
        
        // Save metadata to localStorage as requested
        let metadata = {};
        try {
            const stored = localStorage.getItem("variant_metadata");
            if (stored) {
                metadata = JSON.parse(stored);
            }
        } catch (e) {
            console.error("Lỗi parse metadata", e);
        }

        metadata[product.ma_bien_the] = {
            ten_san_pham: product.ten_san_pham,
            thuong_hieu: product.thuong_hieu,
            don_gia: product.don_gia,
            kich_co: product.kich_co,
            mau_sac: product.mau_sac,
            hinh_anh: product.hinh_anh
        };

        localStorage.setItem("variant_metadata", JSON.stringify(metadata));

        // Call API
        const response = await addToCart(
            userId,
            product.ma_san_pham || 1, 
            product.ma_bien_the,
            1, // quantity
            product.don_gia
        );

        return response;
    } catch (error) {
        console.error("Lỗi thêm nhanh vào giỏ hàng:", error);
        throw error;
    }
};
