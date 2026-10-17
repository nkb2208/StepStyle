import React, { useCallback, useEffect, useState } from 'react';
import {
  apiErrorMessage,
  getPaymentMethods,
  getShippingPartners,
  getStoreSettings,
  updatePaymentMethod,
  updateShippingPartner,
  updateStoreSettings,
} from '../../services/adminSettingService';

const EMPTY_STORE = {
  store_name: '',
  contact_email: '',
  phone: '',
  warehouse_address: { detail: '', ward: '', district: '', province: '' },
  base_shipping_fee: '',
  free_shipping_threshold: '',
};

/** Turn a raw API error into a readable message (validation details included). */
const formatError = (error) => {
  const details = error?.response?.data?.error?.details;
  if (Array.isArray(details) && details.length) {
    return details.map((item) => `${item.field}: ${item.message}`).join(' · ');
  }
  return apiErrorMessage(error);
};

function Notice({ notice, onClose }) {
  if (!notice) return null;
  const isSuccess = notice.type === 'success';
  return (
    <div
      role="status"
      className={
        'flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ' +
        (isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-800')
      }
    >
      <span className="font-medium">{notice.message}</span>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 font-bold opacity-60 hover:opacity-100"
        aria-label="Đóng thông báo"
      >
        ×
      </button>
    </div>
  );
}

function Toggle({ enabled, disabled, onToggle, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={
        'w-11 h-6 rounded-full flex items-center px-1 transition-colors shrink-0 ' +
        (enabled ? 'bg-purple-500' : 'bg-slate-200') +
        (disabled ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer')
      }
    >
      <span
        className={
          'w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ' +
          (enabled ? 'translate-x-5' : '')
        }
      />
    </button>
  );
}

function StatusText({ enabled }) {
  return (
    <span className={'text-xs font-semibold ' + (enabled ? 'text-emerald-600' : 'text-slate-400')}>
      {enabled ? 'Đang bật' : 'Đang tắt'}
    </span>
  );
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [savingStore, setSavingStore] = useState(false);
  const [notice, setNotice] = useState(null);

  const [form, setForm] = useState(EMPTY_STORE);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [shippingPartners, setShippingPartners] = useState([]);
  const [busyIds, setBusyIds] = useState({}); // id -> true while its toggle saves

  const notify = useCallback((type, message) => setNotice({ type, message }), []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [store, methods, partners] = await Promise.all([
        getStoreSettings(),
        getPaymentMethods(),
        getShippingPartners(),
      ]);
      setForm({
        store_name: store.store_name ?? '',
        contact_email: store.contact_email ?? '',
        phone: store.phone ?? '',
        warehouse_address: {
          detail: store.warehouse_address?.detail ?? '',
          ward: store.warehouse_address?.ward ?? '',
          district: store.warehouse_address?.district ?? '',
          province: store.warehouse_address?.province ?? '',
        },
        base_shipping_fee: store.base_shipping_fee ?? '',
        free_shipping_threshold: store.free_shipping_threshold ?? '',
      });
      setPaymentMethods(methods);
      setShippingPartners(partners);
    } catch (error) {
      setLoadError(formatError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-dismiss the notification after a few seconds.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      warehouse_address: { ...prev.warehouse_address, [name]: value },
    }));
  };

  const handleSaveStore = async (event) => {
    event.preventDefault();

    const base = Number(form.base_shipping_fee);
    const threshold = Number(form.free_shipping_threshold);
    const problems = [];
    if (!form.store_name.trim()) problems.push('Tên cửa hàng không được để trống.');
    if (!Number.isInteger(base) || base < 0)
      problems.push('Phí vận chuyển phải là số nguyên ≥ 0.');
    if (!Number.isInteger(threshold) || threshold < 0)
      problems.push('Ngưỡng miễn phí vận chuyển phải là số nguyên ≥ 0.');
    if (problems.length) {
      notify('error', problems.join(' '));
      return;
    }

    setSavingStore(true);
    try {
      const updated = await updateStoreSettings({
        store_name: form.store_name.trim(),
        contact_email: form.contact_email.trim(),
        phone: form.phone.trim(),
        warehouse_address: {
          detail: form.warehouse_address.detail.trim(),
          ward: form.warehouse_address.ward.trim(),
          district: form.warehouse_address.district.trim(),
          province: form.warehouse_address.province.trim(),
        },
        base_shipping_fee: base,
        free_shipping_threshold: threshold,
      });
      setForm((prev) => ({
        ...prev,
        store_name: updated.store_name ?? prev.store_name,
        base_shipping_fee: updated.base_shipping_fee ?? prev.base_shipping_fee,
        free_shipping_threshold:
          updated.free_shipping_threshold ?? prev.free_shipping_threshold,
      }));
      notify('success', 'Đã lưu thông tin cửa hàng.');
    } catch (error) {
      notify('error', formatError(error));
    } finally {
      setSavingStore(false);
    }
  };

  const togglePaymentMethod = async (method) => {
    if (busyIds[method.id]) return;
    const nextEnabled = !method.enabled;
    setBusyIds((prev) => ({ ...prev, [method.id]: true }));
    // Optimistic update, reverted on failure.
    setPaymentMethods((prev) =>
      prev.map((item) => (item.id === method.id ? { ...item, enabled: nextEnabled } : item))
    );
    try {
      const updated = await updatePaymentMethod(method.id, { enabled: nextEnabled });
      setPaymentMethods((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      notify('success', `Đã ${nextEnabled ? 'bật' : 'tắt'} ${updated.name}.`);
    } catch (error) {
      setPaymentMethods((prev) =>
        prev.map((item) => (item.id === method.id ? { ...item, enabled: method.enabled } : item))
      );
      notify('error', formatError(error));
    } finally {
      setBusyIds((prev) => {
        const rest = { ...prev };
        delete rest[method.id];
        return rest;
      });
    }
  };

  const toggleShippingPartner = async (partner) => {
    if (busyIds[partner.id]) return;
    const nextEnabled = !partner.enabled;
    setBusyIds((prev) => ({ ...prev, [partner.id]: true }));
    setShippingPartners((prev) =>
      prev.map((item) => (item.id === partner.id ? { ...item, enabled: nextEnabled } : item))
    );
    try {
      const updated = await updateShippingPartner(partner.id, { enabled: nextEnabled });
      setShippingPartners((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      notify('success', `Đã ${nextEnabled ? 'bật' : 'tắt'} ${updated.name}.`);
    } catch (error) {
      setShippingPartners((prev) =>
        prev.map((item) => (item.id === partner.id ? { ...item, enabled: partner.enabled } : item))
      );
      notify('error', formatError(error));
    } finally {
      setBusyIds((prev) => {
        const rest = { ...prev };
        delete rest[partner.id];
        return rest;
      });
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500 animate-pulse">
        Đang tải cài đặt hệ thống...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Notice notice={{ type: 'error', message: loadError }} onClose={() => setLoadError(null)} />
        <button
          type="button"
          onClick={load}
          className="bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const disabled = savingStore;

  return (
    <div className="space-y-6">
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {/* A. Thông tin cửa hàng */}
      <form
        onSubmit={handleSaveStore}
        className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-5">
          <h3 className="font-bold text-slate-900 text-lg">Thông tin cửa hàng</h3>
          <button
            type="submit"
            disabled={disabled}
            className="bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {disabled ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="store_name">
              Tên cửa hàng
            </label>
            <input
              id="store_name"
              type="text"
              name="store_name"
              value={form.store_name}
              onChange={handleChange}
              disabled={disabled}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 disabled:bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-semibold text-slate-700 mb-2"
                htmlFor="contact_email"
              >
                Email liên hệ
              </label>
              <input
                id="contact_email"
                type="email"
                name="contact_email"
                value={form.contact_email}
                onChange={handleChange}
                disabled={disabled}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="phone">
                Số điện thoại
              </label>
              <input
                id="phone"
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                disabled={disabled}
                placeholder="0901234567"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 disabled:bg-slate-50"
              />
            </div>
          </div>

          <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <legend className="text-sm font-semibold text-slate-700 mb-2">Địa chỉ kho chính</legend>
            <input
              type="text"
              name="detail"
              aria-label="Số nhà, đường"
              value={form.warehouse_address.detail}
              onChange={handleAddressChange}
              disabled={disabled}
              placeholder="Số nhà, đường"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 disabled:bg-slate-50"
            />
            <input
              type="text"
              name="ward"
              aria-label="Phường, xã"
              value={form.warehouse_address.ward}
              onChange={handleAddressChange}
              disabled={disabled}
              placeholder="Phường, xã"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 disabled:bg-slate-50"
            />
            <input
              type="text"
              name="district"
              aria-label="Quận, huyện"
              value={form.warehouse_address.district}
              onChange={handleAddressChange}
              disabled={disabled}
              placeholder="Quận, huyện"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 disabled:bg-slate-50"
            />
            <input
              type="text"
              name="province"
              aria-label="Tỉnh, thành phố"
              value={form.warehouse_address.province}
              onChange={handleAddressChange}
              disabled={disabled}
              placeholder="Tỉnh, thành phố"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 disabled:bg-slate-50"
            />
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-semibold text-slate-700 mb-2"
                htmlFor="base_shipping_fee"
              >
                Phí vận chuyển mặc định (đ)
              </label>
              <input
                id="base_shipping_fee"
                type="number"
                min="0"
                step="1000"
                name="base_shipping_fee"
                value={form.base_shipping_fee}
                onChange={handleChange}
                disabled={disabled}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label
                className="block text-sm font-semibold text-slate-700 mb-2"
                htmlFor="free_shipping_threshold"
              >
                Miễn phí vận chuyển từ (đ)
              </label>
              <input
                id="free_shipping_threshold"
                type="number"
                min="0"
                step="1000"
                name="free_shipping_threshold"
                value={form.free_shipping_threshold}
                onChange={handleChange}
                disabled={disabled}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>
      </form>

      {/* B. Phương thức thanh toán */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-900 text-lg">Phương thức thanh toán</h3>
          <span className="text-xs text-slate-400">Bật/tắt hiển thị cho khách hàng</span>
        </div>
        {paymentMethods.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            Chưa có phương thức thanh toán nào.
          </p>
        ) : (
          <div className="space-y-1 divide-y divide-slate-50">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex justify-between items-center gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {method.name}
                    {method.code ? (
                      <span className="ml-2 text-xs font-normal text-slate-400">{method.code}</span>
                    ) : null}
                  </p>
                  {method.description ? (
                    <p className="text-xs text-slate-400 truncate">{method.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusText enabled={method.enabled} />
                  <Toggle
                    enabled={method.enabled}
                    disabled={Boolean(busyIds[method.id])}
                    onToggle={() => togglePaymentMethod(method)}
                    label={`Bật/tắt ${method.name}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* C. Đối tác vận chuyển */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-900 text-lg">Đối tác vận chuyển</h3>
          <span className="text-xs text-slate-400">Bật/tắt đối tác hoạt động</span>
        </div>
        {shippingPartners.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            Chưa có đối tác vận chuyển nào.
          </p>
        ) : (
          <div className="space-y-1 divide-y divide-slate-50">
            {shippingPartners.map((partner) => (
              <div key={partner.id} className="flex justify-between items-center gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {partner.name}
                    {partner.code ? (
                      <span className="ml-2 text-xs font-normal text-slate-400">{partner.code}</span>
                    ) : null}
                  </p>
                  {partner.description ? (
                    <p className="text-xs text-slate-400 truncate">{partner.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusText enabled={partner.enabled} />
                  <Toggle
                    enabled={partner.enabled}
                    disabled={Boolean(busyIds[partner.id])}
                    onToggle={() => toggleShippingPartner(partner)}
                    label={`Bật/tắt ${partner.name}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
