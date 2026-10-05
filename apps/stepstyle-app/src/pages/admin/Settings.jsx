import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../../services/adminSettingService';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    storeName: 'StepStyle',
    contactEmail: 'hello@stepstyle.vn',
    phoneNumber: '1800-STEPSTYLE',
    address: '123 Lê Lợi, Q1, TP. Hồ Chí Minh',
    topBanner: '🚚 Miễn phí vận chuyển cho đơn hàng trên 500.000đ | Đổi trả trong 30 ngày',
    defaultDiscountCode: 'WELCOME30',
    defaultDiscountPercent: 30,
    baseShippingFee: 35000,
    freeShippingThreshold: 500000,
    partners: {
      ghtk: true,
      ghn: true,
      jt: false,
      viettelpost: false
    },
    payments: {
      cod: true,
      card: true,
      momo: true,
      zalopay: false,
      vnpay: false,
      bank: true
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await getSettings();
        setSettings(prev => ({
          ...prev,
          ...data
        }));
      } catch (err) {
        console.error("Lỗi tải cài đặt", err);
        // Fallback silently if API not implemented
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handlePartnerToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      partners: { ...prev.partners, [key]: !prev.partners[key] }
    }));
  };

  const handlePaymentToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      payments: { ...prev.payments, [key]: !prev.payments[key] }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings(settings);
      alert('Đã lưu thay đổi thành công!');
    } catch (err) {
      console.error("Lỗi lưu cài đặt", err);
      alert('Có lỗi xảy ra khi lưu thay đổi!');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Đang tải cài đặt...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-900 text-lg">Thông tin cửa hàng</h3>
          <button onClick={handleSave} disabled={saving} className="bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tên cửa hàng</label>
            <input type="text" name="storeName" value={settings.storeName} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email liên hệ</label>
            <input type="email" name="contactEmail" value={settings.contactEmail} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Số điện thoại</label>
            <input type="text" name="phoneNumber" value={settings.phoneNumber} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Địa chỉ kho chính</label>
            <input type="text" name="address" value={settings.address} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
        </div>
      </div>
      
      {/* Banner & Khuyến mãi */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-900 text-lg">Banner & Khuyến mãi</h3>
          <button onClick={handleSave} disabled={saving} className="bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors disabled:opacity-50">Lưu thay đổi</button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Banner thông báo (top bar)</label>
            <input type="text" name="topBanner" value={settings.topBanner} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Mã giảm giá mặc định cho khách mới</label>
            <div className="flex gap-3">
              <input type="text" name="defaultDiscountCode" value={settings.defaultDiscountCode} onChange={handleChange} className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
              <div className="relative w-24">
                <input type="text" name="defaultDiscountPercent" value={settings.defaultDiscountPercent} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-8 text-sm focus:outline-none focus:border-purple-500 text-center" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cài đặt vận chuyển */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-900 text-lg">Cài đặt vận chuyển</h3>
          <button onClick={handleSave} disabled={saving} className="bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors disabled:opacity-50">Lưu thay đổi</button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Phí ship cơ bản (đ)</label>
            <input type="text" name="baseShippingFee" value={settings.baseShippingFee} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Đơn hàng được miễn phí ship từ (đ)</label>
            <input type="text" name="freeShippingThreshold" value={settings.freeShippingThreshold} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div className="pt-2">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Đối tác vận chuyển</label>
            <div className="space-y-4 divide-y divide-slate-50">
              {[
                { key: 'ghtk', label: 'GHTK (Giao Hàng Tiết Kiệm)' },
                { key: 'ghn', label: 'GHN (Giao Hàng Nhanh)' },
                { key: 'jt', label: 'J&T Express' },
                { key: 'viettelpost', label: 'ViettelPost' }
              ].map(p => (
                <div key={p.key} className="flex justify-between items-center pt-4">
                  <span className="text-sm font-medium text-slate-700">{p.label}</span>
                  <div onClick={() => handlePartnerToggle(p.key)} className={"w-11 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors " + (settings.partners[p.key] ? 'bg-purple-500' : 'bg-slate-200')}>
                    <div className={"w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform " + (settings.partners[p.key] ? 'translate-x-5' : '')}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-900 text-lg">Phương thức thanh toán</h3>
          <button onClick={handleSave} disabled={saving} className="bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors disabled:opacity-50">Lưu thay đổi</button>
        </div>
        <div className="space-y-4 divide-y divide-slate-50">
          {[
            { key: 'cod', label: 'COD - Thanh toán khi nhận hàng' },
            { key: 'card', label: 'Thẻ tín dụng / Ghi nợ (Visa, Mastercard)' },
            { key: 'momo', label: 'Ví MoMo' },
            { key: 'zalopay', label: 'ZaloPay' },
            { key: 'vnpay', label: 'VNPay' },
            { key: 'bank', label: 'Chuyển khoản ngân hàng' }
          ].map(p => (
            <div key={p.key} className="flex justify-between items-center py-3">
              <span className="text-sm font-medium text-slate-700">{p.label}</span>
              <div onClick={() => handlePaymentToggle(p.key)} className={"w-11 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors " + (settings.payments[p.key] ? 'bg-purple-500' : 'bg-slate-200')}>
                <div className={"w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform " + (settings.payments[p.key] ? 'translate-x-5' : '')}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
