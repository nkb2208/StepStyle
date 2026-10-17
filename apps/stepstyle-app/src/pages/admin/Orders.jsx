import React, { useState } from 'react';
import { formatPrice, ORDERS } from '../../data';

export default function Orders() {
  const [orders] = useState(ORDERS);
  const [loading] = useState(false);
  const [error] = useState(null);

  const getStatusCount = (statusMatch) => {
    return orders.filter(o => {
      if (Array.isArray(statusMatch)) return statusMatch.includes(o.status);
      return o.status === statusMatch;
    }).length;
  };

  return (
    <div className="space-y-6">      
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Chờ xác nhận', count: getStatusCount(['pending', 'unconfirmed']), color: 'bg-amber-50 text-amber-700' },
          { label: 'Đang xử lý', count: getStatusCount('processing'), color: 'bg-blue-50 text-blue-700' },
          { label: 'Đang giao', count: getStatusCount('shipped'), color: 'bg-sky-50 text-sky-700' },
          { label: 'Đã giao', count: getStatusCount(['delivered', 'completed']), color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Đã hủy', count: getStatusCount(['cancelled', 'failed']), color: 'bg-red-50 text-red-700' }
        ].map(s => (
          <div key={s.label} className={s.color + " rounded-2xl p-4 text-center font-bold"}>
            <p className="text-3xl">{s.count}</p>
            <p className="text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-bold text-slate-900 text-lg mb-4">{orders.length} đơn hàng</h3>
        
        {loading ? (
          <div className="text-center py-10 text-slate-500 animate-pulse">Đang tải đơn hàng...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : (
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
              {orders.length === 0 && <tr><td colSpan="6" className="text-center py-6 text-slate-400">Không có đơn hàng nào</td></tr>}
              {orders.map(o => (
                <tr key={o.id || o._id || o.code} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{o.code || o.id || o._id}</td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{o.customerName || o.user?.name || 'Khách'}</p>
                    <p className="text-xs text-slate-400">{o.customerEmail || o.user?.email || ''}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{o.date || new Date(o.created_at || o.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="py-3 px-4 font-bold text-purple-600">{formatPrice(o.total || o.total_amount || 0)}</td>
                  <td className="py-3 px-4">
                    <span className={"px-3 py-1 rounded-full text-xs font-bold " + (
                      ['delivered', 'completed'].includes(o.status) ? 'bg-emerald-50 text-emerald-600' :
                      o.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                      o.status === 'shipped' ? 'bg-sky-50 text-sky-600' :
                      ['cancelled', 'failed'].includes(o.status) ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-600'
                    )}>
                      {['delivered', 'completed'].includes(o.status) ? 'Đã giao' : o.status === 'processing' ? 'Đang xử lý' : o.status === 'shipped' ? 'Đang giao' : ['cancelled', 'failed'].includes(o.status) ? 'Đã hủy' : 'Chờ xác nhận'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{o.paymentMethod || o.payment_method || 'COD'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
