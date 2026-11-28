import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    createAddress,
    deleteAddress,
    listAddresses,
    setDefaultAddress,
    updateAddress,
} from "../../services/loyaltyService";

const EMPTY = {
    ten_nguoi_nhan: "",
    so_dien_thoai: "",
    tinh_thanh: "",
    quan_huyen: "",
    phuong_xa: "",
    dia_chi_chi_tiet: "",
    mac_dinh: false,
};

const FIELDS = [
    ["ten_nguoi_nhan", "Tên người nhận"],
    ["so_dien_thoai", "Số điện thoại"],
    ["tinh_thanh", "Tỉnh / Thành phố"],
    ["quan_huyen", "Quận / Huyện"],
    ["phuong_xa", "Phường / Xã"],
    ["dia_chi_chi_tiet", "Địa chỉ chi tiết (số nhà, đường)"],
];

function AddressBook() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(null); // null = đang ẩn form
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState("");

    const handleError = (err) => {
        console.error("Address error:", err);
        if (err.response?.status === 401) {
            navigate("/login");
            return;
        }
        if (err.response?.status === 422) {
            setMessage("Dữ liệu chưa hợp lệ (không để trống ô nào, số điện thoại dạng 0xxxxxxxxx)");
            return;
        }
        setMessage(err.response?.data?.error?.message || "Không kết nối được máy chủ");
    };

    const load = () => listAddresses().then(setItems).catch(handleError);

    useEffect(() => {
        load();
    }, []);

    const openNew = () => {
        setEditingId(null);
        setForm({ ...EMPTY });
        setMessage("");
    };

    const openEdit = (a) => {
        setEditingId(a.id);
        setForm({ ...a });
        setMessage("");
    };

    const submit = async (e) => {
        e.preventDefault();
        const payload = {};
        FIELDS.forEach(([key]) => {
            payload[key] = String(form[key] || "").trim();
        });
        payload.mac_dinh = !!form.mac_dinh;
        try {
            if (editingId) await updateAddress(editingId, payload);
            else await createAddress(payload);
            setForm(null);
            setMessage("Đã lưu địa chỉ");
            await load();
        } catch (err) {
            handleError(err);
        }
    };

    const makeDefault = async (id) => {
        try {
            await setDefaultAddress(id);
            await load();
        } catch (err) {
            handleError(err);
        }
    };

    const remove = async (id) => {
        if (!window.confirm("Xóa địa chỉ này?")) return;
        try {
            await deleteAddress(id);
            await load();
        } catch (err) {
            handleError(err);
        }
    };

    return (
        <div className="mt-4 p-5 sm:px-8 bg-white rounded-xl shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">Sổ địa chỉ giao hàng</p>
                {!form && (
                    <button
                        type="button"
                        onClick={openNew}
                        className="bg-orange-400 hover:bg-orange-500 rounded-xl px-3 py-2 text-sm font-bold text-white cursor-pointer"
                    >
                        + Thêm địa chỉ
                    </button>
                )}
            </div>

            {items.length === 0 && !form && (
                <p className="mt-4 text-sm text-gray-500">Bạn chưa có địa chỉ nào.</p>
            )}

            {items.map((a) => (
                <div key={a.id} className="mt-4 p-4 border border-gray-200 rounded-xl">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">{a.ten_nguoi_nhan}</p>
                        <p className="text-sm text-gray-500">{a.so_dien_thoai}</p>
                        {a.mac_dinh && (
                            <span className="px-2.5 py-0.5 text-xs text-orange-500 bg-orange-100 rounded-xl font-medium">
                                Mặc định
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 break-words">
                        {a.dia_chi_chi_tiet}, {a.phuong_xa}, {a.quan_huyen}, {a.tinh_thanh}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-4 text-sm">
                        <button type="button" onClick={() => openEdit(a)} className="text-blue-600 cursor-pointer">
                            Sửa
                        </button>
                        {!a.mac_dinh && (
                            <button type="button" onClick={() => makeDefault(a.id)} className="text-orange-500 cursor-pointer">
                                Đặt làm mặc định
                            </button>
                        )}
                        <button type="button" onClick={() => remove(a.id)} className="text-red-500 cursor-pointer">
                            Xóa
                        </button>
                    </div>
                </div>
            ))}

            {form && (
                <form onSubmit={submit} className="mt-4">
                    {FIELDS.map(([key, label]) => (
                        <div key={key} className="mt-3">
                            <label className="font-bold text-sm">{label}</label>
                            <input
                                className="mt-1.5 border border-gray-300 rounded-xl p-3 text-sm w-full outline-none focus:border-orange-400"
                                type="text"
                                value={form[key] || ""}
                                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            />
                        </div>
                    ))}
                    <label className="mt-3 flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={!!form.mac_dinh}
                            onChange={(e) => setForm({ ...form, mac_dinh: e.target.checked })}
                        />
                        Đặt làm địa chỉ mặc định
                    </label>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button type="submit" className="bg-orange-400 hover:bg-orange-500 rounded-xl px-4 py-2 text-sm font-bold text-white cursor-pointer">
                            Lưu địa chỉ
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm(null)}
                            className="border border-gray-300 rounded-xl px-4 py-2 text-sm cursor-pointer"
                        >
                            Hủy
                        </button>
                    </div>
                </form>
            )}

            {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
        </div>
    );
}

export default AddressBook;