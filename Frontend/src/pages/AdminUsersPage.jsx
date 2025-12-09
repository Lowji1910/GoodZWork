import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { userAPI, authAPI } from '../api'

export default function AdminUsersPage() {
    const navigate = useNavigate()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [roleFilter, setRoleFilter] = useState('all')

    // Create user modal
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        role: 'EMPLOYEE'
    })

    useEffect(() => {
        loadUsers()
    }, [statusFilter, roleFilter])

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
        if (newUser.password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự')
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

    const handleFaceEnroll = (userId) => {
        // Navigate to face enrollment page for specific user
        navigate(`/admin/face-enroll/${userId}`)
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ACTIVE':
                return <span className="status-active px-2 py-1 rounded-full text-xs">Hoạt động</span>
            case 'PENDING':
                return <span className="status-pending px-2 py-1 rounded-full text-xs">Chờ duyệt</span>
            case 'INIT':
                return <span className="status-init px-2 py-1 rounded-full text-xs">Mới tạo</span>
            case 'SUSPENDED':
                return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-full text-xs">Tạm khóa</span>
            default:
                return <span className="bg-slate-500/20 text-slate-400 px-2 py-1 rounded-full text-xs">{status}</span>
        }
    }

    const getRoleBadge = (role) => {
        const colors = {
            'SUPER_ADMIN': 'bg-purple-500/20 text-purple-400',
            'HR_MANAGER': 'bg-blue-500/20 text-blue-400',
            'ACCOUNTANT': 'bg-green-500/20 text-green-400',
            'LEADER': 'bg-orange-500/20 text-orange-400',
            'EMPLOYEE': 'bg-slate-500/20 text-slate-400'
        }
        return <span className={`${colors[role] || colors['EMPLOYEE']} px-2 py-1 rounded-full text-xs`}>{role.replace('_', ' ')}</span>
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">👥 Quản lý nhân viên</h1>
                    <p className="text-slate-400">Danh sách và thông tin nhân viên</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary"
                >
                    + Tạo tài khoản
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Trạng thái</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2"
                    >
                        <option value="all">Tất cả</option>
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="PENDING">Chờ duyệt</option>
                        <option value="INIT">Mới tạo</option>
                        <option value="SUSPENDED">Tạm khóa</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Vai trò</label>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2"
                    >
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">{users.length}</p>
                    <p className="text-sm text-slate-400">Tổng số</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{users.filter(u => u.status === 'ACTIVE').length}</p>
                    <p className="text-sm text-slate-400">Đang hoạt động</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-orange-400">{users.filter(u => u.status === 'PENDING').length}</p>
                    <p className="text-sm text-slate-400">Chờ duyệt</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-purple-400">{users.filter(u => u.face_registered).length}</p>
                    <p className="text-sm text-slate-400">Đã đăng ký AI</p>
                </div>
            </div>

            {/* User Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-700/50">
                                <th className="text-left py-4 px-6">Nhân viên</th>
                                <th className="text-left py-4 px-6">Liên hệ</th>
                                <th className="text-left py-4 px-6">Phòng ban</th>
                                <th className="text-center py-4 px-6">Vai trò</th>
                                <th className="text-center py-4 px-6">Trạng thái</th>
                                <th className="text-center py-4 px-6">AI Face</th>
                                <th className="text-center py-4 px-6">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-slate-400">
                                        Không có nhân viên nào
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                                    {user.full_name?.[0] || user.email?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{user.full_name || 'Chưa cập nhật'}</p>
                                                    <p className="text-xs text-slate-400">{user.position || 'Nhân viên'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm">{user.email}</p>
                                            <p className="text-xs text-slate-400">{user.phone || '-'}</p>
                                        </td>
                                        <td className="py-4 px-6">{user.department || '-'}</td>
                                        <td className="py-4 px-6 text-center">{getRoleBadge(user.role)}</td>
                                        <td className="py-4 px-6 text-center">{getStatusBadge(user.status)}</td>
                                        <td className="py-4 px-6 text-center">
                                            {user.face_registered ? (
                                                <span className="text-green-400">✓</span>
                                            ) : (
                                                <span className="text-slate-500">-</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {!user.face_registered && (
                                                <button
                                                    onClick={() => handleFaceEnroll(user.id)}
                                                    className="text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 px-3 py-1.5 rounded-lg transition-colors"
                                                    title="Đăng ký khuôn mặt"
                                                >
                                                    🤖 Đăng ký AI
                                                </button>
                                            )}
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Tạo tài khoản mới</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Email *</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
                                    placeholder="email@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Mật khẩu *</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
                                    placeholder="Tối thiểu 6 ký tự"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Vai trò</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="EMPLOYEE">Nhân viên</option>
                                    <option value="LEADER">Leader</option>
                                    <option value="ACCOUNTANT">Kế toán</option>
                                    <option value="HR_MANAGER">HR Manager</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mt-4">
                            <p className="text-sm text-blue-300">
                                💡 Sau khi tạo, nhân viên sẽ cần đăng nhập để cập nhật hồ sơ và đăng ký khuôn mặt
                            </p>
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 btn-secondary"
                                disabled={creating}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateUser}
                                className="flex-1 btn-primary"
                                disabled={creating}
                            >
                                {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
