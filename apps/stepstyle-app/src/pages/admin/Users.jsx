import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../../services/adminUserService';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    role: 'STAFF',
    active: true
  });

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleCount = (roleMatch) => {
    return users.filter(u => String(u.role).toUpperCase() === roleMatch.toUpperCase()).length;
  };

  const mapRoleToText = (role) => {
    const r = String(role).toUpperCase();
    if (r === 'ADMIN') return 'Quản trị viên';
    if (r === 'STAFF') return 'Nhân viên (Staff)';
    if (r === 'CUSTOMER') return 'Khách hàng';
    return role;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewStaff(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.password) {
      alert("Vui lòng nhập họ tên, email và mật khẩu");
      return;
    }
    try {
      setIsSubmitting(true);
      await createUser(newStaff);
      setNewStaff({
        name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        role: 'STAFF',
        active: true
      });
      setShowAddStaff(false);
      fetchUsers();
    } catch (error) {
      console.error("Lỗi thêm nhân sự:", error);
      alert("Thêm nhân sự thất bại. Có thể email đã tồn tại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showEditStaff, setShowEditStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const openEditModal = (staff) => {
    setEditingStaff({
      id: staff.id,
      name: staff.name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      address: staff.address || '',
      role: staff.role || 'STAFF',
      active: staff.active !== false
    });
    setShowEditStaff(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingStaff(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff.name || !editingStaff.email) {
      alert("Vui lòng nhập họ tên và email");
      return;
    }
    try {
      setIsSubmitting(true);
      await updateUser(editingStaff.id, {
        name: editingStaff.name,
        email: editingStaff.email,
        phone: editingStaff.phone,
        address: editingStaff.address,
        role: editingStaff.role,
        active: editingStaff.active
      });
      setShowEditStaff(false);
      setEditingStaff(null);
      fetchUsers();
    } catch (error) {
      console.error("Lỗi sửa nhân sự:", error);
      alert("Cập nhật nhân sự thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa tài khoản này vĩnh viễn?")) return;
    
    setUsers(prev => prev.filter(u => u.id !== id));
    
    try {
      await deleteUser(id);
      fetchUsers();
    } catch (error) {
      console.error("Lỗi xóa nhân sự:", error);
      alert("Xóa nhân sự thất bại (không thể tự xóa chính mình).");
      fetchUsers();
    }
  };

  return (
    <div className="space-y-6 relative">
      {showAddStaff && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <h3 className="font-bold text-slate-900 text-lg">Thêm nhân sự hệ thống</h3>
              <button onClick={() => setShowAddStaff(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Họ và tên</label>
                <input name="name" value={newStaff.name} onChange={handleInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none" placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input name="email" value={newStaff.email} onChange={handleInputChange} type="email" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none" placeholder="admin@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu</label>
                <input name="password" value={newStaff.password} onChange={handleInputChange} type="password" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none" placeholder="******" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phân quyền</label>
                  <select name="role" value={newStaff.role} onChange={handleInputChange} className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none bg-white">
                    <option value="STAFF">Nhân viên (Staff)</option>
                    <option value="ADMIN">Quản trị viên (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Số điện thoại</label>
                  <input name="phone" value={newStaff.phone} onChange={handleInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none" placeholder="0123456789" />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setShowAddStaff(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Hủy bỏ</button>
              <button onClick={handleCreateStaff} disabled={isSubmitting} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditStaff && editingStaff && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <h3 className="font-bold text-slate-900 text-lg">Chỉnh sửa nhân sự</h3>
              <button onClick={() => setShowEditStaff(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Họ và tên</label>
                <input name="name" value={editingStaff.name} onChange={handleEditInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none" placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input name="email" value={editingStaff.email} onChange={handleEditInputChange} type="email" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none" placeholder="admin@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phân quyền</label>
                  <select name="role" value={editingStaff.role} onChange={handleEditInputChange} className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none bg-white">
                    <option value="STAFF">Nhân viên (Staff)</option>
                    <option value="ADMIN">Quản trị viên (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Số điện thoại</label>
                  <input name="phone" value={editingStaff.phone} onChange={handleEditInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none" placeholder="0123456789" />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setShowEditStaff(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Hủy bỏ</button>
              <button onClick={handleUpdateStaff} disabled={isSubmitting} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Quản trị viên', count: getRoleCount('ADMIN'), color: 'bg-purple-100 text-purple-700' },
          { label: 'Nhân viên', count: getRoleCount('STAFF'), color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Khách hàng', count: getRoleCount('CUSTOMER'), color: 'bg-orange-100 text-orange-700' }
        ].map(r => (
          <div key={r.label} className={r.color + " rounded-2xl p-5 text-center"}>
            <p className="text-2xl font-bold">{r.count}</p>
            <p className="text-sm font-semibold mt-1">{r.label}</p>
          </div>
        ))}
      </div>
      
      <div className='w-full flex items-center justify-end'>
        <button onClick={() => setShowAddStaff(true)} className="bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm shadow-purple-500/30 hover:bg-purple-600 transition-colors">
          + Thêm nhân sự
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 mt-3">
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
              {users.filter(u => String(u.role).toUpperCase() === 'ADMIN' || String(u.role).toUpperCase() === 'STAFF').length === 0 && (
                <tr><td colSpan="5" className="text-center py-6 text-slate-400">Không có nhân sự nào</td></tr>
              )}
              {users.filter(u => String(u.role).toUpperCase() === 'ADMIN' || String(u.role).toUpperCase() === 'STAFF').map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex justify-center items-center font-bold shrink-0">
                        {u.name ? u.name[0] : (u.email ? u.email[0].toUpperCase() : '?')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{u.name || 'Chưa cập nhật'}</p>
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
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-bold px-3 py-1 rounded-full text-xs ${u.active !== false ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                      {u.active !== false ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    <button onClick={() => openEditModal(u)} className="text-purple-500 bg-purple-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-purple-100">Chỉnh sửa</button>
                    <button onClick={() => handleDeleteStaff(u.id)} className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-red-100">Xóa</button>
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
