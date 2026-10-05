import React, { useState, useEffect } from 'react';
import { getUsers } from '../../services/adminUserService';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await getUsers();
        setUsers(data.items || data || []);
      } catch (err) {
        console.error("Lỗi tải người dùng", err);
        setError("Không thể tải danh sách người dùng");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const getRoleCount = (roleMatch) => {
    return users.filter(u => u.role === roleMatch).length;
  };

  const mapRoleToText = (role) => {
    if (role === 'admin') return 'Quản trị viên';
    if (role === 'warehouse') return 'Quản lý kho';
    if (role === 'care') return 'Chăm sóc viên';
    if (role === 'buyer' || role === 'user') return 'Người mua';
    return role;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Quản trị viên', count: getRoleCount('admin'), color: 'bg-purple-100 text-purple-700' },
          { label: 'Quản lý kho', count: getRoleCount('warehouse'), color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Chăm sóc viên', count: getRoleCount('care'), color: 'bg-sky-100 text-sky-700' },
          { label: 'Người mua', count: getRoleCount('buyer') + getRoleCount('user'), color: 'bg-orange-100 text-orange-700' }
        ].map(r => (
          <div key={r.label} className={r.color + " rounded-2xl p-5 text-center"}>
            <p className="text-2xl font-bold">{r.count}</p>
            <p className="text-sm font-semibold mt-1">{r.label}</p>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-bold text-slate-900 text-lg mb-4">Nhân sự hệ thống</h3>
        
        {loading ? (
          <div className="text-center py-10 text-slate-500 animate-pulse">Đang tải người dùng...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : (
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
              {users.filter(u => u.role !== 'buyer' && u.role !== 'user').length === 0 && (
                <tr><td colSpan="5" className="text-center py-6 text-slate-400">Không có nhân sự nào</td></tr>
              )}
              {users.filter(u => u.role !== 'buyer' && u.role !== 'user').map(u => (
                <tr key={u.id || u._id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex justify-center items-center font-bold shrink-0">
                        {u.name ? u.name[0] : (u.email ? u.email[0].toUpperCase() : '?')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{u.name || 'Chưa cập nhật'} {u.role === 'admin' && '(bạn)'}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-purple-600 font-bold bg-purple-50 px-3 py-1 rounded-full text-xs">
                      {mapRoleToText(u.role)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {u.created_at || u.createdAt ? new Date(u.created_at || u.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-bold px-3 py-1 rounded-full text-xs ${u.is_active !== false ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                      {u.is_active !== false ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    {u.role !== 'admin' && <button className="text-purple-500 bg-purple-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-purple-100">Phân quyền</button>}
                    {u.role !== 'admin' && <button className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-red-100">Khóa</button>}
                    {u.role === 'admin' && <span className="text-slate-400">---</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
