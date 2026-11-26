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
        <div className="mt-4 p-5 pr-8 pl-8 bg-white rounded-xl">
            <div className="flex items-center justify-between">
                <p className="font-bold">Sổ địa chỉ giao hàng</p>
                {!form && (
                    <button
                        type="button"
                        onClick={openNew}
                        className="bg-orange-400 rounded-xl p-2 pr-3 pl-3 font-bold text-white"
                    >
                        + Thêm địa chỉ
                    </button>
                )}
            </div>

            {items.length === 0 && !form && (
                <p className="mt-4 text-gray-500">Bạn chưa có địa chỉ nào.</p>
            )}

            {items.map((a) => (
                <div key={a.id} className="mt-4 p-4 border border-gray-300 rounded-xl">
                    <div className="flex items-center gap-2">
                        <p className="font-bold">{a.ten_nguoi_nhan}</p>
                        <p className="text-gray-500">{a.so_dien_thoai}</p>
                        {a.mac_dinh && (
                            <span className="p-1 pr-3 pl-3 text-xs text-orange-400 bg-orange-100 rounded-xl">
                                Mặc định
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-gray-600">
                        {a.dia_chi_chi_tiet}, {a.phuong_xa}, {a.quan_huyen}, {a.tinh_thanh}
                    </p>
                    <div className="mt-2 flex gap-4 text-sm">
                        <button type="button" onClick={() => openEdit(a)} className="text-blue-600">
                            Sửa
                        </button>
                        {!a.mac_dinh && (
                            <button type="button" onClick={() => makeDefault(a.id)} className="text-orange-500">
                                Đặt làm mặc định
                            </button>
                        )}
                        <button type="button" onClick={() => remove(a.id)} className="text-red-500">
                            Xóa
                        </button>
                    </div>
                </div>
            ))}

            {form && (
                <form onSubmit={submit} className="mt-4">
                    {FIELDS.map(([key, label]) => (
                        <div key={key} className="mt-3">
                            <label className="font-bold">{label}</label>
                            <input
                                className="mt-2 border border-gray-500 rounded-xl p-3 w-full"
                                type="text"
                                value={form[key] || ""}
                                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            />
                        </div>
                    ))}
                    <label className="mt-3 flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={!!form.mac_dinh}
                            onChange={(e) => setForm({ ...form, mac_dinh: e.target.checked })}
                        />
                        Đặt làm địa chỉ mặc định
                    </label>
                    <div className="mt-4 flex gap-3">
                        <button type="submit" className="bg-orange-400 rounded-xl p-2 pr-3 pl-3 font-bold text-white">
                            Lưu địa chỉ
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm(null)}
                            className="border border-gray-400 rounded-xl p-2 pr-3 pl-3"
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