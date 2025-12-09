import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { userAPI } from '../api'

export default function AdminPendingPage() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedUser, setSelectedUser] = useState(null)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectReason, setRejectReason] = useState('')

    useEffect(() => {
        loadPendingUsers()
    }, [])

    const loadPendingUsers = async () => {
        try {
            const response = await userAPI.getPendingUsers()
            setUsers(response.data)
        } catch (error) {
            console.error('Failed to load pending users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (userId) => {
        try {
            await userAPI.approveUser(userId)
            toast.success('Đã duyệt hồ sơ!')
            loadPendingUsers()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Duyệt thất bại')
        }
    }

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối')
            return
        }
        try {
            await userAPI.rejectUser(selectedUser.id, rejectReason)
            toast.success('Đã từ chối hồ sơ')
            setShowRejectModal(false)
            setRejectReason('')
            setSelectedUser(null)
            loadPendingUsers()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Từ chối thất bại')
        }
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
            <div>
                <h1 className="text-2xl font-bold">📋 Duyệt hồ sơ nhân viên</h1>
                <p className="text-slate-400">Xem xét và phê duyệt hồ sơ nhân viên mới</p>
            </div>

            {/* User List */}
            <div className="grid gap-4">
                {users.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <p className="text-4xl mb-4">✅</p>
                        <p className="text-slate-400">Không có hồ sơ nào đang chờ duyệt</p>
                    </div>
                ) : (
                    users.map(user => (
                        <div key={user.id} className="glass-card p-6">
                            <div className="flex items-start gap-6">
                                {/* Avatar */}
                                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                                    {user.full_name?.[0] || user.email?.[0] || '?'}
                                </div>

                                {/* Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold">{user.full_name || 'Chưa cập nhật'}</h3>
                                        <span className="status-pending px-2 py-1 rounded-full text-xs">PENDING</span>
                                        {user.face_registered && (
                                            <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full text-xs">
                                                🤖 Đã đăng ký khuôn mặt
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-400">Email</p>
                                            <p>{user.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400">Điện thoại</p>
                                            <p>{user.phone || 'Chưa cập nhật'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400">Phòng ban</p>
                                            <p>{user.department || 'Chưa cập nhật'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400">Chức vụ</p>
                                            <p>{user.position || 'Chưa cập nhật'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => handleApprove(user.id)}
                                        className="btn-primary text-sm px-4 py-2"
                                    >
                                        ✓ Duyệt
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedUser(user)
                                            setShowRejectModal(true)
                                        }}
                                        className="btn-danger text-sm px-4 py-2"
                                    >
                                        ✗ Từ chối
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Từ chối hồ sơ</h3>
                        <p className="text-slate-400 mb-4">
                            Bạn đang từ chối hồ sơ của: <strong>{selectedUser?.full_name || selectedUser?.email}</strong>
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Nhập lý do từ chối..."
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 h-32 resize-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false)
                                    setRejectReason('')
                                    setSelectedUser(null)
                                }}
                                className="flex-1 btn-secondary"
                            >
                                Hủy
                            </button>
                            <button onClick={handleReject} className="flex-1 btn-danger">
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
