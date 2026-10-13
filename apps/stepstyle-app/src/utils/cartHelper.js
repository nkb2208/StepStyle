import { addToCart } from "../services/orderApiService";

export const showToast = (message = "Đã thêm vào giỏ hàng", type = "success") => {
    let container = document.getElementById("stepstyle-toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "stepstyle-toast-container";
        container.style.position = "fixed";
        container.style.top = "20px";
        container.style.right = "20px";
        container.style.zIndex = "99999";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "10px";
        container.style.pointerEvents = "none";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "10px";
    toast.style.backgroundColor = "#ffffff";
    toast.style.color = "#1f2937";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "12px";
    toast.style.border = "1px solid #e5e7eb";
    toast.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)";
    toast.style.transition = "all 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-12px)";

    const isSuccess = type === "success";
    const iconColor = isSuccess ? "#10B981" : "#EF4444";
    const iconSvg = isSuccess
        ? `<polyline points="20 6 9 17 4 12"></polyline>`
        : `<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>`;

    toast.innerHTML = `
        <div style="background-color: ${iconColor}; color: white; width: 22px; height: 22px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                ${iconSvg}
            </svg>
        </div>
        <span style="font-weight: 600; font-size: 14px;">${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-12px)";
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 2000);
};

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

        showToast("Đã thêm vào giỏ hàng");
        return response;
    } catch (error) {
        console.error("Lỗi thêm nhanh vào giỏ hàng:", error);
        throw error;
    }
};
