import React from 'react';
import { USERS } from '../../data';

export default function Users() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Quản trị viên', count: USERS.filter(u=>u.role==='admin').length, color: 'bg-purple-100 text-purple-700' },
          { label: 'Quản lý kho', count: USERS.filter(u=>u.role==='warehouse').length, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Chăm sóc viên', count: USERS.filter(u=>u.role==='care').length, color: 'bg-sky-100 text-sky-700' },
          { label: 'Người mua', count: USERS.filter(u=>u.role==='buyer').length, color: 'bg-orange-100 text-orange-700' }
        ].map(r => (
          <div key={r.label} className={r.color + " rounded-2xl p-5 text-center"}>
            <p className="text-2xl font-bold">{r.count}</p>
            <p className="text-sm font-semibold mt-1">{r.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-bold text-slate-900 text-lg mb-4">Nhân sự hệ thống</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold rounded-tl-xl">Người dùng</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold">Vai trò</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold">Ngày tạo</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold">Trạng thái</th>
              <th className="text-left py-3 px-4 text-slate-500 font-semibold rounded-tr-xl">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {USERS.filter(u => u.role !== 'buyer').map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex justify-center items-center font-bold shrink-0">{u.name[0]}</div>
                    <div>
                      <p className="font-bold text-slate-900">{u.name} {u.role === 'admin' && '(bạn)'}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4"><span className="text-purple-600 font-bold bg-purple-50 px-3 py-1 rounded-full text-xs">{u.role === 'admin' ? 'Quản trị viên' : u.role === 'care' ? 'Chăm sóc viên' : 'Quản lý kho'}</span></td>
                <td className="py-3 px-4 text-slate-600 font-medium">{u.createdAt}</td>
                <td className="py-3 px-4"><span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full text-xs">Hoạt động</span></td>
                <td className="py-3 px-4 flex gap-2">
                  {u.role !== 'admin' && <button className="text-purple-500 bg-purple-50 px-3 py-1.5 rounded-lg font-bold text-xs">Phân quyền</button>}
                  {u.role !== 'admin' && <button className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg font-bold text-xs">Khóa</button>}
                  {u.role === 'admin' && <span className="text-slate-400">---</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
