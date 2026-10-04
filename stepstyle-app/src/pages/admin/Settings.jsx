import React from 'react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-900 text-lg">Thông tin cửa hàng</h3>
          <button className="bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors">Lưu thay đổi</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tên cửa hàng</label>
            <input type="text" defaultValue="StepStyle" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email liên hệ</label>
            <input type="email" defaultValue="hello@stepstyle.vn" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Số điện thoại</label>
            <input type="text" defaultValue="1800-STEPSTYLE" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Địa chỉ kho chính</label>
            <input type="text" defaultValue="123 Lê Lợi, Q1, TP. Hồ Chí Minh" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
        </div>
      </div>
      
      {/* Banner & Khuyến mãi */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-900 text-lg">Banner & Khuyến mãi</h3>
          <button className="bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors">Lưu thay đổi</button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Banner thông báo (top bar)</label>
            <input type="text" defaultValue="🚚 Miễn phí vận chuyển cho đơn hàng trên 500.000đ | Đổi trả trong 30 ngày" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Mã giảm giá mặc định cho khách mới</label>
            <div className="flex gap-3">
              <input type="text" defaultValue="WELCOME30" className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
              <div className="relative w-24">
                <input type="text" defaultValue="30" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-8 text-sm focus:outline-none focus:border-purple-500 text-center" />
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
          <button className="bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors">Lưu thay đổi</button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Phí ship cơ bản (đ)</label>
            <input type="text" defaultValue="35000" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Đơn hàng được miễn phí ship từ (đ)</label>
            <input type="text" defaultValue="500000" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div className="pt-2">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Đối tác vận chuyển</label>
            <div className="space-y-4 divide-y divide-slate-50">
              {[
                { label: 'GHTK (Giao Hàng Tiết Kiệm)', active: true },
                { label: 'GHN (Giao Hàng Nhanh)', active: true },
                { label: 'J&T Express', active: false },
                { label: 'ViettelPost', active: false }
              ].map(p => (
                <div key={p.label} className="flex justify-between items-center pt-4">
                  <span className="text-sm font-medium text-slate-700">{p.label}</span>
                  <div className={"w-11 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors " + (p.active ? 'bg-purple-500' : 'bg-slate-200')}>
                    <div className={"w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform " + (p.active ? 'translate-x-5' : '')}></div>
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
          <button className="bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors">Lưu thay đổi</button>
        </div>
        <div className="space-y-4 divide-y divide-slate-50">
          {[
            { label: 'COD - Thanh toán khi nhận hàng', active: true },
            { label: 'Thẻ tín dụng / Ghi nợ (Visa, Mastercard)', active: true },
            { label: 'Ví MoMo', active: true },
            { label: 'ZaloPay', active: false },
            { label: 'VNPay', active: false },
            { label: 'Chuyển khoản ngân hàng', active: true }
          ].map(p => (
            <div key={p.label} className="flex justify-between items-center py-3">
              <span className="text-sm font-medium text-slate-700">{p.label}</span>
              <div className={"w-11 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors " + (p.active ? 'bg-purple-500' : 'bg-slate-200')}>
                <div className={"w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform " + (p.active ? 'translate-x-5' : '')}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
