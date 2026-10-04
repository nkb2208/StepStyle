import React from 'react';
import { ORDERS, formatPrice } from '../../data';

export default function Orders() {
  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-purple-700 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Chế độ xem — Quản trị viên chỉ theo dõi trạng thái. Việc xử lý đơn hàng do bộ phận Kho thực hiện.
      </div>
      
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Chờ xác nhận', count: 1, color: 'bg-amber-50 text-amber-700' },
          { label: 'Đang xử lý', count: 1, color: 'bg-blue-50 text-blue-700' },
          { label: 'Đang giao', count: 2, color: 'bg-sky-50 text-sky-700' },
          { label: 'Đã giao', count: 2, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Đã hủy', count: 1, color: 'bg-red-50 text-red-700' }
        ].map(s => (
          <div key={s.label} className={s.color + " rounded-2xl p-4 text-center font-bold"}>
            <p className="text-3xl">{s.count}</p>
            <p className="text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-bold text-slate-900 text-lg mb-4">7 đơn hàng</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold rounded-tl-xl">Mã đơn</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold">Khách hàng</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold">Ngày đặt</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold">Tổng tiền</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold">Trạng thái</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold rounded-tr-xl">Thanh toán</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {ORDERS.map(o => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-900">{o.code}</td>
                <td className="py-3 px-4">
                  <p className="font-bold text-slate-900">{o.customerName}</p>
                  <p className="text-xs text-slate-400">{o.customerEmail}</p>
                </td>
                <td className="py-3 px-4 text-slate-600">{o.date}</td>
                <td className="py-3 px-4 font-bold text-purple-600">{formatPrice(o.total)}</td>
                <td className="py-3 px-4">
                  <span className={"px-3 py-1 rounded-full text-xs font-bold " + (
                    o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                    o.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                    o.status === 'shipped' ? 'bg-sky-50 text-sky-600' :
                    o.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-600'
                  )}>
                    {o.status === 'delivered' ? 'Đã giao' : o.status === 'processing' ? 'Đang xử lý' : o.status === 'shipped' ? 'Đang giao' : o.status === 'cancelled' ? 'Đã hủy' : 'Chờ xác nhận'}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600">{o.paymentMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
