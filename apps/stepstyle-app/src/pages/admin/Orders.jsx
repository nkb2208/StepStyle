import { useCallback, useEffect, useState } from 'react';
import { formatPrice } from '../../data';
import {
  getOrders,
  getOrderStats,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
} from '../../services/adminOrderService';

const PAGE_SIZE = 10;

const STATUS = {
  PENDING: { label: 'Chờ xác nhận', badge: 'bg-amber-50 text-amber-600', card: 'bg-amber-50 text-amber-700' },
  PROCESSING: { label: 'Đang xử lý', badge: 'bg-blue-50 text-blue-600', card: 'bg-blue-50 text-blue-700' },
  SHIPPED: { label: 'Đang giao', badge: 'bg-sky-50 text-sky-600', card: 'bg-sky-50 text-sky-700' },
  DELIVERED: { label: 'Đã giao', badge: 'bg-emerald-50 text-emerald-600', card: 'bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'Đã hủy', badge: 'bg-red-50 text-red-600', card: 'bg-red-50 text-red-700' },
};

const PAYMENT = {
  PENDING: 'Chưa thanh toán',
  SUCCESS: 'Đã thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

const errMsg = (err) =>
  err?.response?.data?.error?.message || err?.message || 'Đã có lỗi xảy ra, vui lòng thử lại';

const fmtDate = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '');

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Debounce ô tìm kiếm để không gọi API mỗi lần gõ phím.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await getOrderStats());
    } catch {
      /* thẻ thống kê không quan trọng bằng danh sách */
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrders({
        page,
        page_size: PAGE_SIZE,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setOrders(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const refreshAll = () => { loadOrders(); loadStats(); };

  const openDetail = async (id) => {
    setDetail({ id });
    setDetailLoading(true);
    setDetailError(null);
    try {
      setDetail(await getOrderById(id));
    } catch (err) {
      setDetailError(errMsg(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const changeStatus = async (next) => {
    if (next === 'CANCELLED' && !window.confirm('Bạn chắc chắn muốn hủy đơn hàng này?')) return;
    setSaving(true);
    setDetailError(null);
    try {
      setDetail(await updateOrderStatus(detail.id, next));
      refreshAll();
    } catch (err) {
      setDetailError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async () => {
    setSaving(true);
    setDetailError(null);
    try {
      setDetail(await updatePaymentStatus(detail.id, 'SUCCESS'));
      refreshAll();
    } catch (err) {
      setDetailError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pickFilter = (s) => { setStatusFilter((cur) => (cur === s ? '' : s)); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Thẻ thống kê — bấm để lọc */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(STATUS).map(([key, s]) => (
          <button
            key={key}
            onClick={() => pickFilter(key)}
            className={`${s.card} rounded-2xl p-4 text-center font-medium transition ring-2 ${
              statusFilter === key ? 'ring-indigo-400' : 'ring-transparent'
            }`}
          >
            <p className="text-3xl font-bold">{stats[key.toLowerCase()] ?? 0}</p>
            <p className="text-xs mt-1 font-medium">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h3 className="font-bold text-slate-900 text-lg">
            {total} đơn hàng{statusFilter && ` · ${STATUS[statusFilter].label}`}
          </h3>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm mã đơn, tên, số điện thoại..."
            className="w-72 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600"
          />
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500 animate-pulse font-normal">Đang tải đơn hàng...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500 font-normal">
            {error}{' '}
            <button onClick={refreshAll} className="underline font-medium">Thử lại</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Mã đơn', 'Khách hàng', 'Ngày đặt', 'Tổng tiền', 'Trạng thái', 'Thanh toán'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.length === 0 && (
                <tr><td colSpan="6" className="text-center py-6 text-slate-400 font-normal">Không có đơn hàng nào</td></tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} onClick={() => openDetail(o.id)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="py-3 px-4 font-semibold text-slate-900">#{o.id}</td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-900">{o.ten_nguoi_nhan}</p>
                    <p className="text-xs text-slate-400 font-normal">{o.email_khach || o.so_dien_thoai_nhan}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-normal">{fmtDate(o.ngay_dat)}</td>
                  <td className="py-3 px-4 font-semibold text-indigo-600">{formatPrice(o.tong_thanh_toan)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS[o.trang_thai]?.badge}`}>
                      {STATUS[o.trang_thai]?.label || o.trang_thai}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-normal">
                    <p>{o.phuong_thuc_thanh_toan || '—'}</p>
                    <p className="text-xs text-slate-400 font-normal">{PAYMENT[o.trang_thai_thanh_toan] || ''}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-3 mt-4 text-sm">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40">Trước</button>
            <span className="text-slate-500">Trang {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40">Sau</button>
          </div>
        )}
      </div>

      {/* Chi tiết đơn */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="py-10 text-center text-slate-500 animate-pulse">Đang tải chi tiết...</div>
            ) : !detail.items ? (
              <div className="py-10 text-center text-red-500">{detailError}</div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Đơn hàng #{detail.id}</h3>
                    <p className="text-xs text-slate-400">Đặt lúc {fmtDate(detail.ngay_dat)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS[detail.trang_thai]?.badge}`}>
                    {STATUS[detail.trang_thai]?.label}
                  </span>
                </div>

                <div className="text-sm text-slate-700 space-y-1">
                  <p><b>Người nhận:</b> {detail.ten_nguoi_nhan} · {detail.so_dien_thoai_nhan}</p>
                  <p><b>Địa chỉ:</b> {detail.dia_chi_giao_hang}</p>
                  {detail.ghi_chu && <p><b>Ghi chú:</b> {detail.ghi_chu}</p>}
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-2 px-3">Sản phẩm</th>
                      <th className="py-2 px-3">SL</th>
                      <th className="text-right py-2 px-3">Đơn giá</th>
                      <th className="text-right py-2 px-3">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detail.items.map((i) => (
                      <tr key={i.id}>
                        <td className="py-2 px-3">
                          <p className="font-semibold text-slate-900">{i.ten_san_pham}</p>
                          <p className="text-xs text-slate-400">Size {i.kich_co} · {i.mau_sac}</p>
                        </td>
                        <td className="text-center">{i.so_luong}</td>
                        <td className="text-right px-3">{formatPrice(i.don_gia)}</td>
                        <td className="text-right px-3">{formatPrice(i.thanh_tien)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-sm text-slate-700 space-y-1 text-right">
                  <p>Tiền hàng: {formatPrice(detail.tong_tien_hang)}</p>
                  <p>Giảm giá: -{formatPrice(detail.tien_giam_gia)}</p>
                  <p>Phí vận chuyển: {formatPrice(detail.phi_van_chuyen)}</p>
                  <p className="text-lg font-semibold text-indigo-600">Tổng: {formatPrice(detail.tong_thanh_toan)}</p>
                </div>

                <div className="text-sm border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span>
                    <span className="font-medium">Thanh toán:</span> {detail.phuong_thuc_thanh_toan || '—'} ·{' '}
                    {PAYMENT[detail.trang_thai_thanh_toan] || 'Chưa có giao dịch'}
                  </span>
                  {detail.trang_thai_thanh_toan === 'PENDING' && (
                    <button disabled={saving} onClick={markPaid}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium disabled:opacity-50 transition-colors hover:bg-emerald-700"
                    >
                      Đánh dấu đã thanh toán
                    </button>
                  )}
                </div>

                {detailError && <p className="text-sm text-red-500 font-normal">{detailError}</p>}

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <button onClick={() => setDetail(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors">Đóng</button>
                  <div className="flex gap-2">
                    {detail.trang_thai_ke_tiep.map((next) => (
                      <button key={next} disabled={saving} onClick={() => changeStatus(next)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-colors ${
                          next === 'CANCELLED' ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        {next === 'CANCELLED' ? 'Hủy đơn' : `→ ${STATUS[next].label}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
