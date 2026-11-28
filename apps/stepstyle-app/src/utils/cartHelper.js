import {
    addToCart,
    getMyCart,
    removeCartItem,
    updateCartItem,
} from "../services/orderApiService";

const GUEST_CART_KEY = "stepstyle_guest_cart";

export const isCustomerLoggedIn = () => Boolean(localStorage.getItem("token"));

export const getGuestCart = () => {
    try {
        const raw = localStorage.getItem(GUEST_CART_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && Array.isArray(parsed.items)) {
            return parsed;
        }
    } catch {
        // Ignore corrupted guest cart storage
    }
    return { ma_gio_hang: "guest", items: [] };
};

export const saveGuestCart = (cart) => {
    const items = Array.isArray(cart?.items) ? cart.items : [];
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify({ ma_gio_hang: "guest", items }));
};

export const clearGuestCart = () => {
    localStorage.removeItem(GUEST_CART_KEY);
};

export const saveVariantMetadata = (product) => {
    if (!product?.ma_bien_the) return;
    let metadata = {};
    try {
        const stored = localStorage.getItem("variant_metadata");
        if (stored) metadata = JSON.parse(stored);
    } catch {
        metadata = {};
    }

    metadata[product.ma_bien_the] = {
        ...(metadata[product.ma_bien_the] || {}),
        ma_san_pham: product.ma_san_pham ?? metadata[product.ma_bien_the]?.ma_san_pham ?? 1,
        ten_san_pham: product.ten_san_pham ?? metadata[product.ma_bien_the]?.ten_san_pham,
        thuong_hieu: product.thuong_hieu ?? metadata[product.ma_bien_the]?.thuong_hieu ?? "StepStyle",
        don_gia: product.don_gia ?? metadata[product.ma_bien_the]?.don_gia,
        kich_co: product.kich_co ?? metadata[product.ma_bien_the]?.kich_co ?? "38",
        mau_sac: product.mau_sac ?? metadata[product.ma_bien_the]?.mau_sac ?? "Trắng",
        hinh_anh: product.hinh_anh ?? metadata[product.ma_bien_the]?.hinh_anh,
    };

    localStorage.setItem("variant_metadata", JSON.stringify(metadata));
};

const addItemToGuestCart = (product, quantity = 1) => {
    const cart = getGuestCart();
    const variantId = Number(product.ma_bien_the);
    const qty = Math.max(1, Number(quantity) || 1);
    const existingIdx = cart.items.findIndex((i) => Number(i.ma_bien_the) === variantId);

    if (existingIdx >= 0) {
        cart.items[existingIdx] = {
            ...cart.items[existingIdx],
            so_luong: Number(cart.items[existingIdx].so_luong || 0) + qty,
            don_gia: product.don_gia ?? cart.items[existingIdx].don_gia,
            kich_co: product.kich_co ?? cart.items[existingIdx].kich_co,
            mau_sac: product.mau_sac ?? cart.items[existingIdx].mau_sac,
        };
    } else {
        cart.items.push({
            ma_bien_the: variantId,
            ma_san_pham: product.ma_san_pham || 1,
            so_luong: qty,
            don_gia: product.don_gia,
            ten_san_pham: product.ten_san_pham,
            thuong_hieu: product.thuong_hieu || "StepStyle",
            kich_co: String(product.kich_co || "38"),
            mau_sac: product.mau_sac || "Trắng",
            hinh_anh: product.hinh_anh,
        });
    }

    saveGuestCart(cart);
    return { status: "success", data: cart };
};

export const syncGuestCartToServer = async () => {
    if (!isCustomerLoggedIn()) return;
    const guestCart = getGuestCart();
    if (!guestCart.items.length) return;

    const failedItems = [];
    for (const item of guestCart.items) {
        try {
            await addToCart(
                null,
                item.ma_san_pham || 1,
                item.ma_bien_the,
                Number(item.so_luong) || 1,
                item.don_gia
            );
        } catch (err) {
            console.error("Không thể đồng bộ sản phẩm giỏ hàng khách vãng lai:", err);
            if (err?.response?.status === 401 || err?.response?.status === 503) {
                failedItems.push(item);
            }
        }
    }

    if (failedItems.length === 0) {
        clearGuestCart();
    } else {
        saveGuestCart({ items: failedItems });
    }
};

export const loadActiveCart = async () => {
    if (!isCustomerLoggedIn()) {
        const guest = getGuestCart();
        return { status: "success", data: guest.items.length > 0 ? guest : null };
    }

    try {
        await syncGuestCartToServer();
        return await getMyCart();
    } catch (error) {
        if (error?.response?.status === 401) {
            const guest = getGuestCart();
            return { status: "success", data: guest.items.length > 0 ? guest : null };
        }
        throw error;
    }
};

export const updateActiveCartItem = async (variantId, newQty, extra = {}) => {
    if (!isCustomerLoggedIn()) {
        const cart = getGuestCart();
        const idx = cart.items.findIndex((i) => Number(i.ma_bien_the) === Number(variantId));
        if (idx >= 0) {
            cart.items[idx] = {
                ...cart.items[idx],
                so_luong: Math.max(1, Number(newQty) || 1),
                ...(extra.kich_co ? { kich_co: String(extra.kich_co) } : {}),
                ...(extra.mau_sac ? { mau_sac: extra.mau_sac } : {}),
            };
            saveGuestCart(cart);
        }
        return { status: "success", data: cart };
    }

    return updateCartItem(null, variantId, newQty, extra);
};

export const removeActiveCartItem = async (variantId) => {
    if (!isCustomerLoggedIn()) {
        const cart = getGuestCart();
        cart.items = cart.items.filter((i) => Number(i.ma_bien_the) !== Number(variantId));
        saveGuestCart(cart);
        return { status: "success", data: cart };
    }

    return removeCartItem(null, variantId);
};

export const switchActiveCartVariant = async (oldVariantId, targetProduct, quantity, maxStock = 99) => {
    const newVariantId = Number(targetProduct.ma_bien_the);
    const safeQty = Math.max(1, Math.min(Number(quantity) || 1, Math.max(1, Number(maxStock) || 1)));
    saveVariantMetadata(targetProduct);

    if (Number(oldVariantId) === newVariantId) {
        return updateActiveCartItem(newVariantId, safeQty, {
            kich_co: String(targetProduct.kich_co || ""),
            mau_sac: targetProduct.mau_sac || "",
        });
    }

    if (!isCustomerLoggedIn()) {
        const cart = getGuestCart();
        const remaining = cart.items.filter((i) => Number(i.ma_bien_the) !== Number(oldVariantId));
        const existingIdx = remaining.findIndex((i) => Number(i.ma_bien_the) === newVariantId);

        if (existingIdx >= 0) {
            const mergedQty = Math.min(
                Number(remaining[existingIdx].so_luong || 0) + safeQty,
                Math.max(1, Number(maxStock) || 99)
            );
            remaining[existingIdx] = {
                ...remaining[existingIdx],
                so_luong: mergedQty,
                don_gia: targetProduct.don_gia,
                kich_co: String(targetProduct.kich_co || ""),
                mau_sac: targetProduct.mau_sac || "",
                hinh_anh: targetProduct.hinh_anh,
            };
        } else {
            remaining.push({
                ma_bien_the: newVariantId,
                ma_san_pham: targetProduct.ma_san_pham || 1,
                so_luong: safeQty,
                don_gia: targetProduct.don_gia,
                ten_san_pham: targetProduct.ten_san_pham,
                thuong_hieu: targetProduct.thuong_hieu || "StepStyle",
                kich_co: String(targetProduct.kich_co || ""),
                mau_sac: targetProduct.mau_sac || "",
                hinh_anh: targetProduct.hinh_anh,
            });
        }

        saveGuestCart({ items: remaining });
        return { status: "success", data: { ma_gio_hang: "guest", items: remaining } };
    }

    await addToCart(
        null,
        targetProduct.ma_san_pham || 1,
        newVariantId,
        safeQty,
        targetProduct.don_gia
    );
    await removeCartItem(null, oldVariantId);
    return { status: "success" };
};

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

export const quickAddToCart = async (product, quantity = 1) => {
    try {
        saveVariantMetadata(product);

        // Khách vãng lai: lưu giỏ hàng cục bộ trên trình duyệt, không gọi API yêu cầu đăng nhập
        if (!isCustomerLoggedIn()) {
            const response = addItemToGuestCart(product, quantity);
            showToast("Đã thêm vào giỏ hàng");
            return response;
        }

        // Đã đăng nhập: lưu lên Backend gắn với đúng tài khoản đang đăng nhập
        try {
            const response = await addToCart(
                null,
                product.ma_san_pham || 1,
                product.ma_bien_the,
                quantity,
                product.don_gia
            );
            showToast("Đã thêm vào giỏ hàng");
            return response;
        } catch (apiError) {
            // Nếu token hết hạn/không hợp lệ và không refresh được -> fallback về giỏ khách vãng lai
            if (apiError?.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");
                const response = addItemToGuestCart(product, quantity);
                showToast("Đã thêm vào giỏ hàng");
                return response;
            }
            const errMsg = apiError?.response?.data?.message || "Không thể thêm vào giỏ hàng!";
            showToast(errMsg, "error");
            return null;
        }
    } catch (error) {
        console.error("Lỗi thêm nhanh vào giỏ hàng:", error);
        showToast("Có lỗi xảy ra khi thêm vào giỏ hàng!", "error");
        return null;
    }
};
