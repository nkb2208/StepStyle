import React from 'react';
import { ORDERS, TOP_PRODUCTS, formatPrice } from '../../data';

const MONTHLY_STATS = [
  { month: 'Tháng 3', rev: '42.000.000 đ', orders: 18, avg: '2.333.333 đ', returned: 1, returnRate: '5.6%' },
  { month: 'Tháng 4', rev: '67.000.000 đ', orders: 28, avg: '2.392.857 đ', returned: 2, returnRate: '7.1%' },
  { month: 'Tháng 5', rev: '55.000.000 đ', orders: 23, avg: '2.391.304 đ', returned: 1, returnRate: '4.3%' },
  { month: 'Tháng 6', rev: '89.000.000 đ', orders: 41, avg: '2.170.732 đ', returned: 3, returnRate: '7.3%' },
  { month: 'Tháng 7', rev: '72.000.000 đ', orders: 33, avg: '2.181.818 đ', returned: 2, returnRate: '6.1%' },
  { month: 'Tháng 8', rev: '95.000.000 đ', orders: 47, avg: '2.021.277 đ', returned: 2, returnRate: '4.3%' },
  { month: 'Tháng 9', rev: '88.000.000 đ', orders: 42, avg: '2.095.238 đ', returned: 1, returnRate: '2.4%' }
];

export default function Reports({ MONTHLY, maxRev }) {
  const totalRevenue = ORDERS.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Tổng doanh thu (2025)', value: formatPrice(totalRevenue), icon: '💰' },
          { label: 'Tổng đơn hàng', value: '232', icon: '📦' },
          { label: 'Giá trị đơn TB', value: '2.189.655 đ', icon: '📈' },
          { label: 'Tháng doanh thu cao nhất', value: 'Tháng 8', icon: '🏆' }
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl mb-3">{k.icon}</div>
            <p className="text-2xl font-bold text-purple-600">{k.value}</p>
            <p className="text-sm text-slate-500 font-medium">{k.label}</p>
          </div>
        ))}
      </div>
      
      {/* Chart Section */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-bold text-slate-900 text-lg">Doanh thu & Đơn hàng theo tháng</h3>
          <select className="border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium outline-none focus:border-purple-500 bg-white">
            <option>2025</option>
          </select>
        </div>
        
        <div className="flex items-end gap-2 sm:gap-4 h-64 mb-4">
          {MONTHLY.map(r => (
            <div key={r.month} className="flex-1 flex justify-center items-end gap-1.5 h-full relative group">
              {/* Doanh thu bar */}
              <div className="w-6 sm:w-10 bg-purple-500 rounded-t-lg hover:bg-purple-600 transition-colors relative" 
                   style={{ height: ((r.rev / maxRev) * 100) + '%' }}>
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                     {r.rev}M
                   </div>
              </div>
              {/* Số đơn bar (giả định max là 50) */}
              <div className="w-6 sm:w-10 bg-orange-400 rounded-t-lg hover:bg-orange-500 transition-colors relative" 
                   style={{ height: ((r.orders / 50) * 100) + '%' }}>
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                     {r.orders} đơn
                   </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* X Axis */}
        <div className="flex gap-2 sm:gap-4 border-t border-slate-100 pt-3">
          {MONTHLY.map(r => (
            <div key={r.month} className="flex-1 text-center text-sm text-slate-500 font-medium">{r.month}</div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex gap-6 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm text-slate-600 font-medium">Doanh thu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-400 rounded"></div>
            <span className="text-sm text-slate-600 font-medium">Số đơn</span>
          </div>
        </div>
      </div>

      {/* Table Bảng tổng hợp theo tháng */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-bold text-slate-900 text-lg mb-6">Bảng tổng hợp theo tháng</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-4 px-4 text-slate-500 font-semibold rounded-tl-xl">Tháng</th>
              <th className="text-left py-4 px-4 text-slate-500 font-semibold">Doanh thu</th>
              <th className="text-left py-4 px-4 text-slate-500 font-semibold">Số đơn</th>
              <th className="text-left py-4 px-4 text-slate-500 font-semibold">Giá trị TB</th>
              <th className="text-left py-4 px-4 text-slate-500 font-semibold">Hoàn trả</th>
              <th className="text-left py-4 px-4 text-slate-500 font-semibold rounded-tr-xl">Tỉ lệ hoàn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {MONTHLY_STATS.map(m => (
              <tr key={m.month} className="hover:bg-slate-50">
                <td className="py-4 px-4 font-bold text-slate-900">{m.month}</td>
                <td className="py-4 px-4 font-bold text-purple-600">{m.rev}</td>
                <td className="py-4 px-4 text-slate-600">{m.orders}</td>
                <td className="py-4 px-4 text-slate-600">{m.avg}</td>
                <td className="py-4 px-4 text-slate-600">{m.returned}</td>
                <td className="py-4 px-4"><span className="text-amber-700 font-bold bg-amber-100 px-2.5 py-1 rounded-md">{m.returnRate}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-bold text-slate-900 mb-5 text-lg">Top sản phẩm bán chạy</h3>
        <div className="space-y-4">
          {TOP_PRODUCTS.map((p, i) => (
            <div key={p.id} className="flex items-center gap-4">
              <span className={"w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 " + (i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-700' : 'bg-slate-200 text-slate-500')}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-bold text-slate-900">{p.name}</span>
                    <span className="text-xs text-slate-400 ml-2">{p.brand}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-purple-600">{formatPrice(p.revenue)}</p>
                    <p className="text-xs text-slate-400">{p.sold} đôi</p>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: ((p.sold / TOP_PRODUCTS[0].sold) * 100) + '%' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
