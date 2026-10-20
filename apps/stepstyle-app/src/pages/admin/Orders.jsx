import { useCallback, useEffect, useState } from 'react';
import { formatPrice } from '../../data';
import {
  getOrders,
  getOrderStats,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  createOrder,
  updateOrder,
  deleteOrder,
  getVariantOptions,
  getPaymentMethods,
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

const EDITABLE = ['PENDING', 'PROCESSING'];
const EMPTY_FORM = {
  ten_nguoi_nhan: '',
  so_dien_thoai_nhan: '',
  dia_chi_giao_hang: '',
  ghi_chu: '',
  ma_phuong_thuc: '',
  phi_van_chuyen: 0,
  tien_giam_gia: 0,
  items: [{ ma_bien_the: '', so_luong: 1 }],
};
const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400';

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

  // Sửa thông tin giao hàng (trong popup chi tiết)
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Tạo đơn mới
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [variants, setVariants] = useState([]);
  const [methods, setMethods] = useState([]);
  const [formError, setFormError] = useState(null);

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
    setEditing(false);
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

  // ── Sửa thông tin giao hàng ──
  const startEdit = () => {
    setEditForm({
      ten_nguoi_nhan: detail.ten_nguoi_nhan,
      so_dien_thoai_nhan: detail.so_dien_thoai_nhan,
      dia_chi_giao_hang: detail.dia_chi_giao_hang,
      ghi_chu: detail.ghi_chu || '',
    });
    setDetailError(null);
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    setDetailError(null);
    try {
      setDetail(await updateOrder(detail.id, { ...editForm, ghi_chu: editForm.ghi_chu.trim() || null }));
      setEditing(false);
      refreshAll();
    } catch (err) {
      setDetailError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  // ── Xóa đơn (chỉ đơn đã hủy) ──
  const removeOrder = async () => {
    if (!window.confirm(`Xóa vĩnh viễn đơn #${detail.id}? Thao tác này không thể hoàn tác.`)) return;
    setSaving(true);
    setDetailError(null);
    try {
      await deleteOrder(detail.id);
      setDetail(null);
      refreshAll();
    } catch (err) {
      setDetailError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  // ── Tạo đơn ──
  const openCreate = async () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreating(true);
    try {
      const [v, m] = await Promise.all([getVariantOptions(), getPaymentMethods()]);
      setVariants(v);
      setMethods(m);
    } catch (err) {
      setFormError(errMsg(err));
    }
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setItem = (i, k, v) =>
    setForm((f) => ({ ...f, items: f.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ma_bien_the: '', so_luong: 1 }] }));
  const removeItem = (i) =>
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, idx) => idx !== i) : f.items }));

  const variantById = (id) => variants.find((v) => v.ma_bien_the === Number(id));
  const subtotal = form.items.reduce(
    (sum, it) => sum + (variantById(it.ma_bien_the)?.don_gia || 0) * (Number(it.so_luong) || 0),
    0
  );
  const grandTotal = subtotal - (Number(form.tien_giam_gia) || 0) + (Number(form.phi_van_chuyen) || 0);

  const submitCreate = async () => {
    if (form.items.some((it) => !it.ma_bien_the)) {
      setFormError('Vui lòng chọn sản phẩm cho tất cả các dòng');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await createOrder({
        ten_nguoi_nhan: form.ten_nguoi_nhan,
        so_dien_thoai_nhan: form.so_dien_thoai_nhan,
        dia_chi_giao_hang: form.dia_chi_giao_hang,
        ghi_chu: form.ghi_chu.trim() || null,
        ma_phuong_thuc: form.ma_phuong_thuc ? Number(form.ma_phuong_thuc) : null,
        phi_van_chuyen: Number(form.phi_van_chuyen) || 0,
        tien_giam_gia: Number(form.tien_giam_gia) || 0,
        items: form.items.map((it) => ({ ma_bien_the: Number(it.ma_bien_the), so_luong: Number(it.so_luong) })),
      });
      setCreating(false);
      setStatusFilter('');
      setSearchInput('');
      setPage(1);
      refreshAll();
      setDetail(created);
    } catch (err) {
      setFormError(
        err?.response?.status === 422 ? 'Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại các ô đã nhập' : errMsg(err)
      );
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
            className={`${s.card} rounded-2xl p-4 text-center font-bold transition ring-2 ${
              statusFilter === key ? 'ring-purple-400' : 'ring-transparent'
            }`}
          >
            <p className="text-3xl">{stats[key.toLowerCase()] ?? 0}</p>
            <p className="text-xs mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h3 className="font-bold text-slate-900 text-lg">
            {total} đơn hàng{statusFilter && ` · ${STATUS[statusFilter].label}`}
          </h3>
          <button onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold whitespace-nowrap">
            + Tạo đơn
          </button>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm mã đơn, tên, số điện thoại..."
            className="w-72 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
          />
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500 animate-pulse">Đang tải đơn hàng...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">
            {error}{' '}
            <button onClick={refreshAll} className="underline font-semibold">Thử lại</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Mã đơn', 'Khách hàng', 'Ngày đặt', 'Tổng tiền', 'Trạng thái', 'Thanh toán'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-slate-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.length === 0 && (
                <tr><td colSpan="6" className="text-center py-6 text-slate-400">Không có đơn hàng nào</td></tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} onClick={() => openDetail(o.id)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="py-3 px-4 font-bold text-slate-900">#{o.id}</td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{o.ten_nguoi_nhan}</p>
                    <p className="text-xs text-slate-400">{o.email_khach || o.so_dien_thoai_nhan}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{fmtDate(o.ngay_dat)}</td>
                  <td className="py-3 px-4 font-bold text-purple-600">{formatPrice(o.tong_thanh_toan)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS[o.trang_thai]?.badge}`}>
                      {STATUS[o.trang_thai]?.label || o.trang_thai}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <p>{o.phuong_thuc_thanh_toan || '—'}</p>
                    <p className="text-xs text-slate-400">{PAYMENT[o.trang_thai_thanh_toan] || ''}</p>
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

                {editing ? (
                  <div className="space-y-2 text-sm">
                    <input className={inputCls} placeholder="Tên người nhận" value={editForm.ten_nguoi_nhan}
                      onChange={(e) => setEditForm({ ...editForm, ten_nguoi_nhan: e.target.value })} />
                    <input className={inputCls} placeholder="Số điện thoại" value={editForm.so_dien_thoai_nhan}
                      onChange={(e) => setEditForm({ ...editForm, so_dien_thoai_nhan: e.target.value })} />
                    <textarea className={inputCls} rows={2} placeholder="Địa chỉ giao hàng" value={editForm.dia_chi_giao_hang}
                      onChange={(e) => setEditForm({ ...editForm, dia_chi_giao_hang: e.target.value })} />
                    <textarea className={inputCls} rows={2} placeholder="Ghi chú" value={editForm.ghi_chu}
                      onChange={(e) => setEditForm({ ...editForm, ghi_chu: e.target.value })} />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs">Hủy sửa</button>
                      <button disabled={saving} onClick={saveEdit}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold disabled:opacity-50">Lưu</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-700 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <p><b>Người nhận:</b> {detail.ten_nguoi_nhan} · {detail.so_dien_thoai_nhan}</p>
                      {EDITABLE.includes(detail.trang_thai) && (
                        <button onClick={startEdit} className="text-xs font-bold text-purple-600 underline whitespace-nowrap">Sửa thông tin</button>
                      )}
                    </div>
                    <p><b>Địa chỉ:</b> {detail.dia_chi_giao_hang}</p>
                    {detail.ghi_chu && <p><b>Ghi chú:</b> {detail.ghi_chu}</p>}
                  </div>
                )}

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
                  <p className="text-lg font-bold text-purple-600">Tổng: {formatPrice(detail.tong_thanh_toan)}</p>
                </div>

                <div className="text-sm border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span>
                    <b>Thanh toán:</b> {detail.phuong_thuc_thanh_toan || '—'} ·{' '}
                    {PAYMENT[detail.trang_thai_thanh_toan] || 'Chưa có giao dịch'}
                  </span>
                  {detail.trang_thai_thanh_toan === 'PENDING' && (
                    <button disabled={saving} onClick={markPaid}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">
                      Đánh dấu đã thanh toán
                    </button>
                  )}
                </div>

                {detailError && <p className="text-sm text-red-500">{detailError}</p>}

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex gap-2">
                    <button onClick={() => setDetail(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm">Đóng</button>
                    {detail.trang_thai === 'CANCELLED' && (
                      <button disabled={saving} onClick={removeOrder}
                        className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-bold disabled:opacity-50">Xóa đơn</button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {detail.trang_thai_ke_tiep.map((next) => (
                      <button key={next} disabled={saving} onClick={() => changeStatus(next)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 ${
                          next === 'CANCELLED' ? 'bg-red-500' : 'bg-purple-600'
                        }`}>
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
      {/* Tạo đơn mới */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCreating(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900">Tạo đơn hàng mới</h3>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <input className={inputCls} placeholder="Tên người nhận *" value={form.ten_nguoi_nhan}
                onChange={(e) => setField('ten_nguoi_nhan', e.target.value)} />
              <input className={inputCls} placeholder="Số điện thoại *" value={form.so_dien_thoai_nhan}
                onChange={(e) => setField('so_dien_thoai_nhan', e.target.value)} />
              <textarea className={`${inputCls} col-span-2`} rows={2} placeholder="Địa chỉ giao hàng *" value={form.dia_chi_giao_hang}
                onChange={(e) => setField('dia_chi_giao_hang', e.target.value)} />
              <select className={inputCls} value={form.ma_phuong_thuc} onChange={(e) => setField('ma_phuong_thuc', e.target.value)}>
                <option value="">-- Phương thức thanh toán --</option>
                {methods.map((m) => <option key={m.ma_phuong_thuc} value={m.ma_phuong_thuc}>{m.ten_phuong_thuc}</option>)}
              </select>
              <input className={inputCls} placeholder="Ghi chú" value={form.ghi_chu}
                onChange={(e) => setField('ghi_chu', e.target.value)} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-700">Sản phẩm</p>
              {form.items.map((it, i) => (
                <div key={i} className="flex gap-2 items-center text-sm">
                  <select className={`${inputCls} flex-1`} value={it.ma_bien_the} onChange={(e) => setItem(i, 'ma_bien_the', e.target.value)}>
                    <option value="">-- Chọn sản phẩm --</option>
                    {variants.map((v) => (
                      <option key={v.ma_bien_the} value={v.ma_bien_the} disabled={v.so_luong_kho === 0}>
                        {v.ten_san_pham} · {v.kich_co} · {v.mau_sac} · {formatPrice(v.don_gia)} (kho: {v.so_luong_kho})
                      </option>
                    ))}
                  </select>
                  <input type="number" min="1" className={`${inputCls} w-20`} value={it.so_luong}
                    onChange={(e) => setItem(i, 'so_luong', e.target.value)} />
                  <button onClick={() => removeItem(i)} className="text-red-500 font-bold px-2" title="Xóa dòng">×</button>
                </div>
              ))}
              <button onClick={addItem} className="text-xs font-bold text-purple-600 underline">+ Thêm sản phẩm</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="text-slate-600">Giảm giá (đ)
                <input type="number" min="0" className={inputCls} value={form.tien_giam_gia}
                  onChange={(e) => setField('tien_giam_gia', e.target.value)} />
              </label>
              <label className="text-slate-600">Phí vận chuyển (đ)
                <input type="number" min="0" className={inputCls} value={form.phi_van_chuyen}
                  onChange={(e) => setField('phi_van_chuyen', e.target.value)} />
              </label>
            </div>

            <div className="text-right text-sm text-slate-700">
              <p>Tiền hàng: {formatPrice(subtotal)}</p>
              <p className="text-lg font-bold text-purple-600">Tổng: {formatPrice(Math.max(grandTotal, 0))}</p>
              <p className="text-xs text-slate-400">Giá cuối cùng do hệ thống tính lại từ giá sản phẩm trong CSDL.</p>
            </div>

            {formError && <p className="text-sm text-red-500">{formError}</p>}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm">Hủy</button>
              <button disabled={saving} onClick={submitCreate}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold disabled:opacity-50">
                {saving ? 'Đang tạo...' : 'Tạo đơn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
