import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../../services/adminUserService';

const normalizeUser = (u) => ({
  id: u.id,
  name: u.ho_ten ?? u.name ?? '',
  email: u.email ?? '',
  phone: u.so_dien_thoai ?? u.phone ?? '',
  address: u.dia_chi ?? u.address ?? '',
  role: String(u.vai_tro ?? u.role ?? 'CUSTOMER').toUpperCase(),
  active: u.kich_hoat ?? u.active ?? true,
  created_at: u.ngay_tao ?? u.created_at ?? u.createdAt ?? null,
});

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Email của quản trị viên đang đăng nhập (từ localStorage)
  const currentUserEmail = (() => {
    try {
      const session = JSON.parse(localStorage.getItem('user') || 'null');
      return String(session?.email || '').toLowerCase();
    } catch { return ''; }
  })();

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    role: 'ADMIN',
    active: true
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [lockingId, setLockingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers({ page: 1, page_size: 100 });
      const rawItems = data?.items || (Array.isArray(data) ? data : []);
      setUsers(rawItems.map(normalizeUser));
    } catch (err) {
      console.error("Lỗi tải người dùng", err);
      setError("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
      await createUser({
        ho_ten: newStaff.name.trim(),
        email: newStaff.email.trim(),
        mat_khau: newStaff.password,
        so_dien_thoai: newStaff.phone?.trim() || null,
      });
      setNewStaff({
        name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        role: 'ADMIN',
        active: true
      });
      setShowAddStaff(false);
      await fetchUsers();
    } catch (err) {
      console.error("Lỗi thêm nhân sự:", err);
      alert(err?.response?.data?.error?.message || "Thêm nhân sự thất bại!");
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
      role: 'ADMIN',
      active: staff.active !== false
    });
    setShowEditStaff(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingStaff(prev => ({
      ...prev,
      [name]: name === 'active' ? value === 'true' : value
    }));
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff.name || !editingStaff.email) {
      alert("Vui lòng nhập họ tên và email");
      return;
    }
    try {
      setIsSubmitting(true);
      await updateUser(editingStaff.id, {
        ho_ten: editingStaff.name.trim(),
        so_dien_thoai: editingStaff.phone?.trim() || null,
        kich_hoat: editingStaff.active,
      });
      setShowEditStaff(false);
      setEditingStaff(null);
      await fetchUsers();
    } catch (err) {
      console.error("Lỗi cập nhật nhân sự:", err);
      alert(err?.response?.data?.error?.message || "Cập nhật nhân sự thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa tài khoản này vĩnh viễn?")) return;
    try {
      await deleteUser(id);
      await fetchUsers();
    } catch (err) {
      console.error("Lỗi xóa nhân sự:", err);
      alert(err?.response?.data?.error?.message || "Xóa tài khoản thất bại!");
    }
  };

  const handleToggleLockCustomer = async (customer) => {
    const nextActive = customer.active === false;
    const actionLabel = nextActive ? 'mở khóa' : 'khóa';
    if (!confirm(`Bạn có chắc muốn ${actionLabel} tài khoản khách hàng "${customer.name || customer.email}"?`)) {
      return;
    }
    try {
      setLockingId(customer.id);
      await updateUser(customer.id, {
        kich_hoat: nextActive,
      });
      await fetchUsers();
      if (selectedCustomer && selectedCustomer.id === customer.id) {
        setSelectedCustomer((prev) => (prev ? { ...prev, active: nextActive } : null));
      }
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái khách hàng:", err);
      alert(err?.response?.data?.error?.message || "Không thể cập nhật trạng thái tài khoản!");
    } finally {
      setLockingId(null);
    }
  };

  const handleViewCustomerDetail = async (customer) => {
    try {
      const data = await getUserById(customer.id);
      setSelectedCustomer(normalizeUser(data));
    } catch (err) {
      console.error("Lỗi lấy chi tiết khách hàng:", err);
      setSelectedCustomer(customer);
    }
  };

  const staffList = users.filter(
    (u) => String(u.role).toUpperCase() === 'ADMIN' || String(u.role).toUpperCase() === 'STAFF'
  );

  const customerList = users
    .filter((u) => String(u.role).toUpperCase() === 'CUSTOMER')
    .filter((u) => {
      if (!customerSearch.trim()) return true;
      const q = customerSearch.trim().toLowerCase();
      return (
        String(u.name || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.phone || '').toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6 relative">
      {/* Modal Thêm nhân sự (Chỉ thêm Quản trị viên ADMIN) */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <h3 className="font-bold text-slate-900 text-lg">Thêm nhân sự quản lý</h3>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Số điện thoại</label>
                <input name="phone" value={newStaff.phone} onChange={handleInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none" placeholder="0123456789" />
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setShowAddStaff(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">Hủy bỏ</button>
              <button onClick={handleCreateStaff} disabled={isSubmitting} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa nhân sự */}
      {showEditStaff && editingStaff && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <h3 className="font-bold text-slate-900 text-lg">Chỉnh sửa quản trị viên</h3>
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
                <input name="email" value={editingStaff.email} disabled type="email" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Số điện thoại</label>
                <input name="phone" value={editingStaff.phone} onChange={handleEditInputChange} type="text" className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none" placeholder="0123456789" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái tài khoản</label>
                <select
                  name="active"
                  value={editingStaff.active ? 'true' : 'false'}
                  onChange={handleEditInputChange}
                  className="w-full border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none bg-white"
                >
                  <option value="true">Hoạt động</option>
                  <option value="false">Bị khóa</option>
                </select>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setShowEditStaff(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">Hủy bỏ</button>
              <button onClick={handleUpdateStaff} disabled={isSubmitting} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem chi tiết thông tin khách hàng */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCustomer(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold text-lg">
                  {selectedCustomer.name ? selectedCustomer.name[0].toUpperCase() : (selectedCustomer.email ? selectedCustomer.email[0].toUpperCase() : 'K')}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Chi tiết khách hàng</h3>
                  <p className="text-xs text-slate-400 font-normal">Mã tài khoản: #{selectedCustomer.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4">
                <div>
                  <p className="text-xs text-slate-400 font-normal">Họ và tên</p>
                  <p className="font-medium text-slate-900 mt-0.5">{selectedCustomer.name || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-normal">Trạng thái</p>
                  <div className="mt-1">
                    <span className={`font-medium px-3 py-1 rounded-full text-xs ${selectedCustomer.active !== false ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                      {selectedCustomer.active !== false ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-normal">Email</p>
                  <p className="font-medium text-slate-800 mt-0.5 break-all">{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-normal">Số điện thoại</p>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedCustomer.phone || 'Chưa cập nhật'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 font-normal">Địa chỉ giao hàng</p>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedCustomer.address || 'Chưa cập nhật địa chỉ'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-normal">Vai trò</p>
                  <p className="font-medium text-orange-600 mt-0.5">Khách hàng (CUSTOMER)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-normal">Ngày đăng ký</p>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleString('vi-VN') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                onClick={() => handleToggleLockCustomer(selectedCustomer)}
                disabled={lockingId === selectedCustomer.id}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                  selectedCustomer.active !== false
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {selectedCustomer.active !== false ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Khóa tài khoản này
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                    Mở khóa tài khoản
                  </span>
                )}
              </button>
              <button onClick={() => setSelectedCustomer(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Quản trị viên (Admin)', count: getRoleCount('ADMIN'), color: 'bg-purple-100 text-purple-700' },
          { label: 'Khách hàng', count: getRoleCount('CUSTOMER'), color: 'bg-orange-100 text-orange-700' }
        ].map(r => (
          <div key={r.label} className={r.color + " rounded-2xl p-5 text-center"}>
            <p className="text-2xl font-bold">{r.count}</p>
            <p className="text-sm font-medium mt-1">{r.label}</p>
          </div>
        ))}
      </div>
      
      <div className='w-full flex items-center justify-end'>
        <button onClick={() => setShowAddStaff(true)} className="bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm shadow-purple-500/30 hover:bg-purple-600 transition-colors">
          + Thêm quản trị viên
        </button>
      </div>

      {/* Bảng 1: Nhân sự hệ thống (Quản trị viên) */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 mt-3">
        <h3 className="font-bold text-slate-900 text-lg mb-4">Nhân sự quản trị ({staffList.length})</h3>
        
        {loading ? (
          <div className="text-center py-10 text-slate-500 animate-pulse">Đang tải người dùng...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-3 px-4 text-slate-500 font-medium rounded-tl-xl">Người dùng</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Vai trò</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Ngày tạo</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Trạng thái</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium rounded-tr-xl">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staffList.length === 0 && (
                <tr><td colSpan="5" className="text-center py-6 text-slate-400">Không có nhân sự quản trị nào</td></tr>
              )}
              {staffList.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex justify-center items-center font-semibold shrink-0">
                        {u.name ? u.name[0].toUpperCase() : (u.email ? u.email[0].toUpperCase() : '?')}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{u.name || 'Chưa cập nhật'}</p>
                        <p className="text-xs text-slate-400 font-normal">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-purple-600 font-medium bg-purple-50 px-3 py-1 rounded-full text-xs">
                      {mapRoleToText(u.role)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-normal">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-medium px-3 py-1 rounded-full text-xs ${u.active !== false ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                      {u.active !== false ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    <button onClick={() => openEditModal(u)} className="text-purple-500 bg-purple-50 px-3 py-1.5 rounded-lg font-medium text-xs hover:bg-purple-100">Chỉnh sửa</button>
                    <button
                      onClick={() => handleDeleteStaff(u.id)}
                      disabled={String(u.email).toLowerCase() === currentUserEmail}
                      title={String(u.email).toLowerCase() === currentUserEmail ? 'Không thể xóa tài khoản đang đăng nhập' : 'Xóa tài khoản'}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
                        String(u.email).toLowerCase() === currentUserEmail
                          ? 'text-slate-400 bg-slate-100 cursor-not-allowed opacity-50'
                          : 'text-red-500 bg-red-50 hover:bg-red-100'
                      }`}
                    >Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bảng 2: Quản lý tài khoản khách hàng */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Danh sách khách hàng ({customerList.length})</h3>
            <p className="text-xs text-slate-400 font-normal mt-0.5">Xem thông tin chi tiết và khóa/mở khóa tài khoản mua hàng</p>
          </div>
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Tìm tên, email, SĐT khách hàng..."
            className="w-full sm:w-72 border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2 text-sm outline-none"
          />
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500 animate-pulse">Đang tải danh sách khách hàng...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-3 px-4 text-slate-500 font-medium rounded-tl-xl">Khách hàng</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Số điện thoại</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Ngày đăng ký</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Trạng thái</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium rounded-tr-xl">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {customerList.length === 0 && (
                <tr><td colSpan="5" className="text-center py-6 text-slate-400">Chưa có tài khoản khách hàng nào</td></tr>
              )}
              {customerList.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex justify-center items-center font-semibold shrink-0">
                        {c.name ? c.name[0].toUpperCase() : (c.email ? c.email[0].toUpperCase() : 'K')}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{c.name || 'Chưa cập nhật'}</p>
                        <p className="text-xs text-slate-400 font-normal">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-normal">
                    {c.phone || 'Chưa cập nhật'}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-normal">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-medium px-3 py-1 rounded-full text-xs ${c.active !== false ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                      {c.active !== false ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    <button
                      onClick={() => handleViewCustomerDetail(c)}
                      className="text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg font-medium text-xs hover:bg-sky-100 transition-colors"
                    >
                      Xem chi tiết
                    </button>
                    <button
                      onClick={() => handleToggleLockCustomer(c)}
                      disabled={lockingId === c.id}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors disabled:opacity-50 ${
                        c.active !== false
                          ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                          : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      {c.active !== false ? 'Khóa tài khoản' : 'Mở khóa'}
                    </button>
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
