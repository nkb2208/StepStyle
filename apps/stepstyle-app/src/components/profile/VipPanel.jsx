import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getMembership,
    listPackages,
    listTransactions,
    mockPay,
    purchasePackage,
} from "../../services/loyaltyService";

const STATUS_LABEL = {
    PENDING: "Chờ thanh toán",
    SUCCESS: "Thành công",
    FAILED: "Thất bại",
    CANCELLED: "Đã hủy",
};

// Service trả giờ UTC không kèm múi giờ, thêm "Z" để trình duyệt đổi đúng giờ địa phương
const toDate = (iso) =>
    iso ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`) : null;
const fmtDate = (iso) => (iso ? toDate(iso).toLocaleDateString("vi-VN") : "");
const fmtMoney = (n) => `${Number(n).toLocaleString("vi-VN")}đ`;

function VipPanel({ onChanged }) {
    const navigate = useNavigate();
    const [membership, setMembership] = useState(null);
    const [packages, setPackages] = useState([]);
    const [txns, setTxns] = useState([]);
    const [message, setMessage] = useState("");
    const [busyId, setBusyId] = useState(null);

    const handleError = (err) => {
        console.error("VIP error:", err);
        if (err.response?.status === 401) {
            navigate("/login");
            return;
        }
        setMessage(err.response?.data?.error?.message || "Không kết nối được máy chủ");
    };

    const load = () =>
        Promise.all([getMembership(), listPackages(), listTransactions()])
            .then(([m, p, t]) => {
                setMembership(m);
                setPackages(p);
                setTxns(t);
            })
            .catch(handleError);

    useEffect(() => {
        load();
    }, []);

    const buy = async (pkg) => {
        if (!window.confirm(`Mua "${pkg.ten_goi}" với giá ${fmtMoney(pkg.gia)}?`)) return;
        setMessage("");
        setBusyId(pkg.id);
        try {
            const txn = await purchasePackage(pkg.id);
            await mockPay(txn.ma_giao_dich);
            setMessage(`Đã nâng cấp lên hạng ${pkg.ma_hang}`);
            await load();
            if (onChanged) onChanged(); // cho trang Profile cập nhật nhãn hạng
        } catch (err) {
            handleError(err);
            await load();
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="mt-4 p-5 pr-8 pl-8 bg-white rounded-xl">
            <p className="font-bold">Gói VIP</p>

            {membership && (
                <p className="mt-2 text-gray-600">
                    Hạng hiện tại: <b>{membership.ten_hang}</b>
                    {membership.phan_tram_giam > 0 && ` · giảm ${membership.phan_tram_giam}%`}
                    {membership.mien_phi_van_chuyen && " · miễn phí vận chuyển"}
                    {membership.ma_hang !== "STANDARD" && membership.ngay_het_han &&
                        ` · hết hạn ${fmtDate(membership.ngay_het_han)}`}
                    {" · "}{membership.tong_diem} điểm
                </p>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3">
                {packages.map((p) => (
                    <div key={p.id} className="p-4 border border-gray-300 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="font-bold">{p.ten_goi}</p>
                            <p className="text-sm text-gray-500">
                                Hạng {p.ma_hang} · {p.so_ngay} ngày
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <p className="font-bold text-orange-400">{fmtMoney(p.gia)}</p>
                            <button
                                type="button"
                                disabled={busyId !== null}
                                onClick={() => buy(p)}
                                className="bg-orange-400 rounded-xl p-2 pr-3 pl-3 font-bold text-white disabled:opacity-50"
                            >
                                {busyId === p.id ? "Đang xử lý..." : "Mua"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}

            {txns.length > 0 && (
                <div className="mt-6">
                    <p className="font-bold">Lịch sử giao dịch</p>
                    {txns.map((t) => (
                        <div key={t.ma_giao_dich} className="mt-2 flex justify-between text-sm text-gray-600">
                            <span>
                                {fmtDate(t.ngay_tao)} · {t.ma_giao_dich}
                            </span>
                            <span>
                                {fmtMoney(t.so_tien)} · {STATUS_LABEL[t.trang_thai] || t.trang_thai}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default VipPanel;