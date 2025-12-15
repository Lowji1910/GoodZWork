import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { userAPI, authAPI } from '../api'
import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function AdminUsersPage() {
    const navigate = useNavigate()
    const { hasRole } = useAuth()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [roleFilter, setRoleFilter] = useState('all')

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showActionModal, setShowActionModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [actionType, setActionType] = useState('')
    const [openDropdown, setOpenDropdown] = useState(null)

    const [creating, setCreating] = useState(false)
    const [newUser, setNewUser] = useState({ email: '', password: '', role: 'EMPLOYEE' })
    const [editData, setEditData] = useState({ full_name: '', phone: '', department: '', position: '' })

    const isAdmin = hasRole(['SUPER_ADMIN'])
    const dropdownRef = useRef(null)

    useEffect(() => {
        loadUsers()
    }, [statusFilter, roleFilter])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpenDropdown(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const loadUsers = async () => {
        try {
            const status = statusFilter === 'all' ? null : statusFilter
            const role = roleFilter === 'all' ? null : roleFilter
            const response = await userAPI.listUsers(status, role)
            setUsers(response.data)
        } catch (error) {
            console.error('Failed to load users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.password) {
            toast.error('Vui lòng nhập đầy đủ email và mật khẩu')
            return
        }
        setCreating(true)
        try {
            await authAPI.register(newUser)
            toast.success('Tạo tài khoản thành công!')
            setShowCreateModal(false)
            setNewUser({ email: '', password: '', role: 'EMPLOYEE' })
            loadUsers()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Tạo tài khoản thất bại')
        } finally {
            setCreating(false)
        }
    }

    const handleViewDetail = async (user) => {
        try {
            const response = await userAPI.getUser(user.id)
            setSelectedUser(response.data)
            setShowDetailModal(true)
        } catch (error) {
            toast.error('Không thể tải thông tin chi tiết')
        }
    }

    const handleEditUser = (user) => {
        setOpenDropdown(null)
        setSelectedUser(user)
        setEditData({
            full_name: user.full_name || '',
            phone: user.phone || '',
            department: user.department || '',
            position: user.position || ''
        })
        setShowEditModal(true)
    }

    const handleSaveEdit = async () => {
        try {
            await userAPI.adminUpdateUser(selectedUser.id, editData)
            toast.success('Cập nhật thành công!')
            setShowEditModal(false)
            loadUsers()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Cập nhật thất bại')
        }
    }

    const handleAction = (user, action) => {
        setOpenDropdown(null)
        setSelectedUser(user)
        setActionType(action)
        setShowActionModal(true)
    }

    const confirmAction = async () => {
        try {
            switch (actionType) {
                case 'suspend':
                    await userAPI.updateUserStatus(selectedUser.id, 'SUSPENDED')
                    toast.success('Đã tạm khóa tài khoản')
                    break
                case 'terminate':
                    await userAPI.updateUserStatus(selectedUser.id, 'TERMINATED')
                    toast.success('Đã cho nhân viên nghỉ việc')
                    break
                case 'activate':
                    await userAPI.updateUserStatus(selectedUser.id, 'ACTIVE')
                    toast.success('Đã kích hoạt tài khoản')
                    break
                case 'reset':
                    const res = await userAPI.resetUserPassword(selectedUser.id)
                    toast.success(`Đã reset mật khẩu về: ${res.data.default_password}`)
                    break
                default:
                    break
            }
            setShowActionModal(false)
            loadUsers()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Thao tác thất bại')
        }
    }

    const handleChangeRole = async (user, newRole) => {
        setOpenDropdown(null)
        try {
            await userAPI.updateUserRole(user.id, newRole)
            toast.success(`Đổi vai trò thành ${newRole}`)
            loadUsers()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Thay đổi vai trò thất bại')
        }
    }

    const getStatusBadge = (status) => {
        const styles = {
            'ACTIVE': 'bg-green-100 text-green-700 border border-green-300',
            'PENDING': 'bg-orange-100 text-orange-700 border border-orange-300',
            'INIT': 'bg-yellow-100 text-yellow-700 border border-yellow-300',
            'SUSPENDED': 'bg-amber-100 text-amber-700 border border-amber-300',
            'TERMINATED': 'bg-red-100 text-red-700 border border-red-300'
        }
        const labels = {
            'ACTIVE': 'Hoạt động',
            'PENDING': 'Chờ duyệt',
            'INIT': 'Mới tạo',
            'SUSPENDED': 'Tạm khóa',
            'TERMINATED': 'Đã nghỉ'
        }
        return <span className={`${styles[status] || 'bg-gray-100 text-gray-700'} px-2 py-1 rounded-full text-xs`}>{labels[status] || status}</span>
    }

    const getRoleBadge = (role) => {
        const colors = {
            'SUPER_ADMIN': 'bg-purple-100 text-purple-700',
            'HR_MANAGER': 'bg-blue-100 text-blue-700',
            'ACCOUNTANT': 'bg-emerald-100 text-emerald-700',
            'LEADER': 'bg-orange-100 text-orange-700',
            'EMPLOYEE': 'bg-slate-100 text-slate-700'
        }
        return <span className={`${colors[role] || colors['EMPLOYEE']} px-2 py-1 rounded-full text-xs`}>{role?.replace('_', ' ')}</span>
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">👥 Quản lý nhân viên</h1>
                    <p className="text-slate-500">Danh sách và thông tin nhân viên</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">+ Tạo tài khoản</button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <div>
                    <label className="block text-sm text-slate-600 mb-1">Trạng thái</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-700">
                        <option value="all">Tất cả</option>
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="PENDING">Chờ duyệt</option>
                        <option value="INIT">Mới tạo</option>
                        <option value="SUSPENDED">Tạm khóa</option>
                        <option value="TERMINATED">Đã nghỉ</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-slate-600 mb-1">Vai trò</label>
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-700">
                        <option value="all">Tất cả</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                        <option value="HR_MANAGER">HR Manager</option>
                        <option value="ACCOUNTANT">Kế toán</option>
                        <option value="LEADER">Leader</option>
                        <option value="EMPLOYEE">Nhân viên</option>
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{users.length}</p>
                    <p className="text-sm text-slate-500">Tổng số</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{users.filter(u => u.status === 'ACTIVE').length}</p>
                    <p className="text-sm text-slate-500">Hoạt động</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{users.filter(u => u.status === 'PENDING').length}</p>
                    <p className="text-sm text-slate-500">Chờ duyệt</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.face_registered).length}</p>
                    <p className="text-sm text-slate-500">Đăng ký AI</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{users.filter(u => u.status === 'TERMINATED').length}</p>
                    <p className="text-sm text-slate-500">Đã nghỉ</p>
                </div>
            </div>

            {/* User Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Nhân viên</th>
                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Liên hệ</th>
                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Phòng ban</th>
                                <th className="text-center py-4 px-6 font-semibold text-slate-700">Vai trò</th>
                                <th className="text-center py-4 px-6 font-semibold text-slate-700">Trạng thái</th>
                                <th className="text-center py-4 px-6 font-semibold text-slate-700">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-slate-500">Không có nhân viên nào</td></tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="border-t border-slate-200 hover:bg-slate-50">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden">
                                                    {user.avatar ? (
                                                        <img src={`${API_URL}${user.avatar}`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        user.full_name?.[0] || user.email?.[0] || '?'
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{user.full_name || 'Chưa cập nhật'}</p>
                                                    <p className="text-xs text-slate-500">{user.employee_id || user.position || 'Nhân viên'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm text-slate-700">{user.email}</p>
                                            <p className="text-xs text-slate-500">{user.phone || '-'}</p>
                                        </td>
                                        <td className="py-4 px-6 text-slate-700">{user.department || '-'}</td>
                                        <td className="py-4 px-6 text-center">{getRoleBadge(user.role)}</td>
                                        <td className="py-4 px-6 text-center">{getStatusBadge(user.status)}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-2" ref={openDropdown === user.id ? dropdownRef : null}>
                                                <button onClick={() => handleViewDetail(user)} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors">👁 Chi tiết</button>
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                                                        className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        ⋮ Thao tác
                                                    </button>
                                                    {openDropdown === user.id && (
                                                        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1">
                                                            <button onClick={() => handleEditUser(user)} className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-slate-700">✏️ Chỉnh sửa</button>
                                                            {user.status !== 'SUSPENDED' && user.status !== 'TERMINATED' && (
                                                                <button onClick={() => handleAction(user, 'suspend')} className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-amber-600">⏸ Tạm khóa</button>
                                                            )}
                                                            {user.status === 'SUSPENDED' && (
                                                                <button onClick={() => handleAction(user, 'activate')} className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-green-600">▶ Kích hoạt</button>
                                                            )}
                                                            {user.status !== 'TERMINATED' && (
                                                                <button onClick={() => handleAction(user, 'terminate')} className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-red-600">🚫 Cho nghỉ việc</button>
                                                            )}
                                                            <button onClick={() => handleAction(user, 'reset')} className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-slate-700">🔑 Reset mật khẩu</button>
                                                            {isAdmin && (
                                                                <div className="border-t border-slate-200 mt-1 pt-1">
                                                                    <p className="px-4 py-1 text-xs text-slate-400">Đổi vai trò:</p>
                                                                    {['EMPLOYEE', 'LEADER', 'HR_MANAGER'].filter(r => r !== user.role).map(role => (
                                                                        <button key={role} onClick={() => handleChangeRole(user, role)} className="w-full text-left px-4 py-1.5 hover:bg-slate-100 text-xs text-slate-600">{role.replace('_', ' ')}</button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Tạo tài khoản mới</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                                <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" placeholder="email@company.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Mật khẩu *</label>
                                <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" placeholder="Tối thiểu 6 ký tự" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Vai trò</label>
                                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3">
                                    <option value="EMPLOYEE">Nhân viên</option>
                                    <option value="LEADER">Leader</option>
                                    <option value="ACCOUNTANT">Kế toán</option>
                                    <option value="HR_MANAGER">HR Manager</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 btn-secondary" disabled={creating}>Hủy</button>
                            <button onClick={handleCreateUser} className="flex-1 btn-primary" disabled={creating}>{creating ? 'Đang tạo...' : 'Tạo'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedUser && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">Chi tiết nhân viên</h3>
                            <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
                        </div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                                {selectedUser.avatar ? <img src={`${API_URL}${selectedUser.avatar}`} className="w-full h-full object-cover" /> : selectedUser.full_name?.[0] || '?'}
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-slate-800">{selectedUser.full_name || 'Chưa cập nhật'}</h4>
                                <p className="text-slate-500">{selectedUser.employee_id || selectedUser.position || 'Nhân viên'}</p>
                                <div className="flex gap-2 mt-1">{getRoleBadge(selectedUser.role)}{getStatusBadge(selectedUser.status)}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-500 text-xs">Email</p><p className="text-slate-800">{selectedUser.email}</p></div>
                            <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-500 text-xs">Điện thoại</p><p className="text-slate-800">{selectedUser.phone || '—'}</p></div>
                            <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-500 text-xs">Phòng ban</p><p className="text-slate-800">{selectedUser.department || '—'}</p></div>
                            <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-500 text-xs">Chức vụ</p><p className="text-slate-800">{selectedUser.position || '—'}</p></div>
                        </div>
                        {(selectedUser.bank_name || selectedUser.bank_account_number) && (
                            <div className="mt-4 border-t border-slate-200 pt-4">
                                <h5 className="font-medium text-slate-700 mb-2">💳 Thông tin ngân hàng</h5>
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-500 text-xs">Ngân hàng</p><p className="text-slate-800">{selectedUser.bank_name || '—'}</p></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-500 text-xs">Số TK</p><p className="text-slate-800">{selectedUser.bank_account_number || '—'}</p></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-500 text-xs">Chủ TK</p><p className="text-slate-800">{selectedUser.bank_account_holder || '—'}</p></div>
                                </div>
                            </div>
                        )}
                        <button onClick={() => setShowDetailModal(false)} className="w-full btn-secondary mt-6">Đóng</button>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Chỉnh sửa thông tin</h3>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-2">Họ và tên</label><input type="text" value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-2">Điện thoại</label><input type="tel" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-2">Phòng ban</label><select value={editData.department} onChange={(e) => setEditData({ ...editData, department: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3"><option value="">Chọn phòng ban</option><option value="IT">IT</option><option value="HR">HR</option><option value="Finance">Finance</option><option value="Marketing">Marketing</option><option value="Sales">Sales</option><option value="Operations">Operations</option></select></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-2">Chức vụ</label><input type="text" value={editData.position} onChange={(e) => setEditData({ ...editData, position: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" /></div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setShowEditModal(false)} className="flex-1 btn-secondary">Hủy</button>
                            <button onClick={handleSaveEdit} className="flex-1 btn-primary">Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Confirmation Modal */}
            {showActionModal && selectedUser && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
                        <p className="text-4xl mb-4">{actionType === 'suspend' ? '⏸' : actionType === 'terminate' ? '🚫' : actionType === 'activate' ? '✅' : '🔑'}</p>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">
                            {actionType === 'suspend' && 'Tạm khóa tài khoản?'}
                            {actionType === 'terminate' && 'Cho nhân viên nghỉ việc?'}
                            {actionType === 'activate' && 'Kích hoạt tài khoản?'}
                            {actionType === 'reset' && 'Reset mật khẩu?'}
                        </h3>
                        <p className="text-slate-500 mb-4">{selectedUser.full_name || selectedUser.email}</p>
                        {actionType === 'reset' && <p className="text-sm text-amber-600 mb-4 bg-amber-50 rounded-lg px-3 py-2">Mật khẩu sẽ được reset về: 123456</p>}
                        <div className="flex gap-4">
                            <button onClick={() => setShowActionModal(false)} className="flex-1 btn-secondary">Hủy</button>
                            <button onClick={confirmAction} className={`flex-1 ${actionType === 'terminate' ? 'btn-danger' : 'btn-primary'}`}>Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
