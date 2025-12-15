import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { leaveAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const LEAVE_TYPES = [
    { value: 'ANNUAL', label: 'Nghỉ phép năm', icon: '🏖️', color: 'blue' },
    { value: 'SICK', label: 'Nghỉ ốm', icon: '🤒', color: 'red' },
    { value: 'PERSONAL', label: 'Việc riêng', icon: '👤', color: 'purple' },
    { value: 'MATERNITY', label: 'Thai sản', icon: '🤰', color: 'pink' },
    { value: 'WEDDING', label: 'Nghỉ cưới', icon: '💒', color: 'yellow' },
    { value: 'BEREAVEMENT', label: 'Nghỉ tang', icon: '🕯️', color: 'gray' },
    { value: 'UNPAID', label: 'Không lương', icon: '💸', color: 'orange' }
]

export default function LeavesPage() {
    const { user, hasRole } = useAuth()
    const [activeTab, setActiveTab] = useState('my-leaves')
    const [loading, setLoading] = useState(true)
    const [myLeaves, setMyLeaves] = useState([])
    const [pendingLeaves, setPendingLeaves] = useState([])
    const [summary, setSummary] = useState({ total_used: 0, annual_quota: 12, remaining: 12 })
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [selectedLeave, setSelectedLeave] = useState(null)
    const [rejectReason, setRejectReason] = useState('')

    const canApprove = hasRole(['SUPER_ADMIN', 'HR_MANAGER', 'LEADER'])

    const [newLeave, setNewLeave] = useState({
        leave_type: 'ANNUAL',
        start_date: '',
        end_date: '',
        reason: '',
        half_day: false
    })

    useEffect(() => {
        loadData()
    }, [activeTab])

    const loadData = async () => {
        setLoading(true)
        try {
            if (activeTab === 'my-leaves') {
                const res = await leaveAPI.getMyLeaves()
                setMyLeaves(res.data.leaves)
                setSummary(res.data.summary)
            } else if (activeTab === 'pending') {
                const res = await leaveAPI.getPendingLeaves()
                setPendingLeaves(res.data)
            }
        } catch (error) {
            console.error('Failed to load leaves:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateLeave = async () => {
        if (!newLeave.start_date || !newLeave.end_date || !newLeave.reason.trim()) {
            toast.error('Vui lòng nhập đầy đủ thông tin')
            return
        }
        try {
            await leaveAPI.createLeave(newLeave)
            toast.success('Đã gửi đơn xin nghỉ phép!')
            setShowCreateModal(false)
            setNewLeave({ leave_type: 'ANNUAL', start_date: '', end_date: '', reason: '', half_day: false })
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Gửi đơn thất bại')
        }
    }

    const handleApprove = async (leaveId) => {
        try {
            await leaveAPI.approveLeave(leaveId)
            toast.success('Đã duyệt đơn!')
            loadData()
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
            await leaveAPI.rejectLeave(selectedLeave.id, rejectReason)
            toast.success('Đã từ chối đơn')
            setShowRejectModal(false)
            setRejectReason('')
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Từ chối thất bại')
        }
    }

    const handleCancel = async (leaveId) => {
        if (!confirm('Bạn có chắc muốn hủy đơn này?')) return
        try {
            await leaveAPI.cancelLeave(leaveId)
            toast.success('Đã hủy đơn')
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Hủy đơn thất bại')
        }
    }

    const getLeaveTypeInfo = (type) => LEAVE_TYPES.find(t => t.value === type) || LEAVE_TYPES[0]

    const getStatusBadge = (status) => {
        const styles = {
            'PENDING': 'bg-yellow-100 text-yellow-700',
            'APPROVED': 'bg-green-100 text-green-700',
            'REJECTED': 'bg-red-100 text-red-700',
            'CANCELLED': 'bg-slate-100 text-slate-700'
        }
        const labels = {
            'PENDING': 'Chờ duyệt',
            'APPROVED': 'Đã duyệt',
            'REJECTED': 'Từ chối',
            'CANCELLED': 'Đã hủy'
        }
        return <span className={`${styles[status]} px-2 py-1 rounded-full text-xs`}>{labels[status]}</span>
    }

    if (loading && myLeaves.length === 0 && pendingLeaves.length === 0) {
        return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">🏖️ Nghỉ phép</h1>
                    <p className="text-slate-500">Quản lý đơn xin nghỉ phép</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">+ Tạo đơn nghỉ</button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{summary.annual_quota}</p>
                    <p className="text-sm text-slate-500">Tổng ngày phép năm</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-3xl font-bold text-orange-600">{summary.total_used}</p>
                    <p className="text-sm text-slate-500">Đã sử dụng</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{summary.remaining}</p>
                    <p className="text-sm text-slate-500">Còn lại</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveTab('my-leaves')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'my-leaves' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    📋 Đơn của tôi
                </button>
                {canApprove && (
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'pending' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        ⏳ Chờ duyệt
                        {pendingLeaves.length > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingLeaves.length}</span>
                        )}
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="glass-card overflow-hidden">
                {activeTab === 'my-leaves' && (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Loại</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Thời gian</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Số ngày</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Lý do</th>
                                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Trạng thái</th>
                                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myLeaves.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">Chưa có đơn nghỉ phép nào</td></tr>
                                ) : (
                                    myLeaves.map(leave => {
                                        const typeInfo = getLeaveTypeInfo(leave.leave_type)
                                        return (
                                            <tr key={leave.id} className="border-t border-slate-200 hover:bg-slate-50">
                                                <td className="py-3 px-4">
                                                    <span className="flex items-center gap-2">
                                                        <span>{typeInfo.icon}</span>
                                                        <span className="text-slate-700">{typeInfo.label}</span>
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-600">
                                                    {format(new Date(leave.start_date), 'dd/MM/yyyy')}
                                                    {leave.start_date !== leave.end_date && ` - ${format(new Date(leave.end_date), 'dd/MM/yyyy')}`}
                                                </td>
                                                <td className="py-3 px-4 text-slate-700 font-medium">{leave.days} ngày</td>
                                                <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{leave.reason}</td>
                                                <td className="py-3 px-4 text-center">{getStatusBadge(leave.status)}</td>
                                                <td className="py-3 px-4 text-center">
                                                    {leave.status === 'PENDING' && (
                                                        <button onClick={() => handleCancel(leave.id)} className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg">Hủy</button>
                                                    )}
                                                    {leave.status === 'REJECTED' && leave.rejected_reason && (
                                                        <span className="text-xs text-red-500" title={leave.rejected_reason}>Xem lý do</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'pending' && (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Nhân viên</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Loại</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Thời gian</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Số ngày</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Lý do</th>
                                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingLeaves.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">Không có đơn chờ duyệt</td></tr>
                                ) : (
                                    pendingLeaves.map(leave => {
                                        const typeInfo = getLeaveTypeInfo(leave.leave_type)
                                        return (
                                            <tr key={leave.id} className="border-t border-slate-200 hover:bg-slate-50">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                                            {leave.user.name?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-800 font-medium">{leave.user.name}</p>
                                                            <p className="text-xs text-slate-500">{leave.user.department}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="flex items-center gap-2">
                                                        <span>{typeInfo.icon}</span>
                                                        <span className="text-slate-700">{typeInfo.label}</span>
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-600">
                                                    {format(new Date(leave.start_date), 'dd/MM/yyyy')}
                                                    {leave.start_date !== leave.end_date && ` - ${format(new Date(leave.end_date), 'dd/MM/yyyy')}`}
                                                </td>
                                                <td className="py-3 px-4 text-slate-700 font-medium">{leave.days} ngày</td>
                                                <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{leave.reason}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => handleApprove(leave.id)} className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg">✓ Duyệt</button>
                                                        <button onClick={() => { setSelectedLeave(leave); setShowRejectModal(true) }} className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg">✕ Từ chối</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Leave Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Tạo đơn xin nghỉ phép</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Loại nghỉ phép</label>
                                <select value={newLeave.leave_type} onChange={(e) => setNewLeave({ ...newLeave, leave_type: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3">
                                    {LEAVE_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Từ ngày *</label>
                                    <input type="date" value={newLeave.start_date} onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Đến ngày *</label>
                                    <input type="date" value={newLeave.end_date} onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="half_day" checked={newLeave.half_day} onChange={(e) => setNewLeave({ ...newLeave, half_day: e.target.checked })} className="rounded" />
                                <label htmlFor="half_day" className="text-sm text-slate-600">Nghỉ nửa ngày</label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Lý do *</label>
                                <textarea value={newLeave.reason} onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 h-24 resize-none" placeholder="Nhập lý do xin nghỉ..." />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 btn-secondary">Hủy</button>
                            <button onClick={handleCreateLeave} className="flex-1 btn-primary">Gửi đơn</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedLeave && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Từ chối đơn nghỉ phép</h3>
                        <p className="text-slate-600 mb-4">Đơn của: <strong>{selectedLeave.user.name}</strong></p>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Lý do từ chối *</label>
                            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 h-24 resize-none" placeholder="Nhập lý do từ chối..." />
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => { setShowRejectModal(false); setRejectReason('') }} className="flex-1 btn-secondary">Hủy</button>
                            <button onClick={handleReject} className="flex-1 btn-danger">Từ chối</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
