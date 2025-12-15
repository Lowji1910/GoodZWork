import { useState, useEffect } from 'react'
import { overtimeAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { Clock, Plus, Check, X, Calendar, Timer } from 'lucide-react'
import { format } from 'date-fns'

const OT_STATUS = {
    PENDING: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700' },
    APPROVED: { label: 'Đã duyệt', color: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-slate-100 text-slate-700' }
}

export default function OvertimePage() {
    const { hasRole } = useAuth()
    const [activeTab, setActiveTab] = useState('my-ot')
    const [loading, setLoading] = useState(true)
    const [myOT, setMyOT] = useState([])
    const [summary, setSummary] = useState({})
    const [pendingOT, setPendingOT] = useState([])

    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '18:00',
        end_time: '21:00',
        reason: ''
    })

    const [rejectModal, setRejectModal] = useState({ show: false, otId: null })
    const [rejectReason, setRejectReason] = useState('')

    const isManager = hasRole(['SUPER_ADMIN', 'HR_MANAGER', 'LEADER'])

    useEffect(() => {
        loadData()
    }, [activeTab])

    const loadData = async () => {
        setLoading(true)
        try {
            if (activeTab === 'my-ot') {
                const res = await overtimeAPI.getMyOT()
                setMyOT(res.data.overtime_requests)
                setSummary(res.data.summary)
            } else if (activeTab === 'pending' && isManager) {
                const res = await overtimeAPI.getPendingOT()
                setPendingOT(res.data)
            }
        } catch (error) {
            console.error('Failed to load OT data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        try {
            await overtimeAPI.createOT(formData)
            toast.success('Đã gửi đăng ký OT!')
            setShowModal(false)
            setFormData({ date: format(new Date(), 'yyyy-MM-dd'), start_time: '18:00', end_time: '21:00', reason: '' })
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Lỗi khi đăng ký OT')
        }
    }

    const handleApprove = async (otId) => {
        try {
            await overtimeAPI.approveOT(otId)
            toast.success('Đã duyệt OT!')
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Lỗi khi duyệt OT')
        }
    }

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối')
            return
        }
        try {
            await overtimeAPI.rejectOT(rejectModal.otId, rejectReason)
            toast.success('Đã từ chối OT!')
            setRejectModal({ show: false, otId: null })
            setRejectReason('')
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Lỗi khi từ chối OT')
        }
    }

    const handleCancel = async (otId) => {
        if (!confirm('Bạn có chắc muốn hủy đăng ký này?')) return
        try {
            await overtimeAPI.cancelOT(otId)
            toast.success('Đã hủy đăng ký OT!')
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Lỗi khi hủy OT')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Timer size={28} className="text-orange-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Quản lý OT</h1>
                        <p className="text-slate-500">Đăng ký và quản lý làm thêm giờ</p>
                    </div>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Đăng ký OT
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-4 text-center">
                    <p className="text-3xl font-bold text-slate-800">{summary.total_requests || 0}</p>
                    <p className="text-sm text-slate-500">Tổng đăng ký</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{summary.approved_hours || 0}h</p>
                    <p className="text-sm text-slate-500">Đã duyệt</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-3xl font-bold text-yellow-600">{summary.pending || 0}</p>
                    <p className="text-sm text-slate-500">Chờ duyệt</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
                <button onClick={() => setActiveTab('my-ot')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'my-ot' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Clock size={18} /> OT của tôi
                </button>
                {isManager && (
                    <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'pending' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Check size={18} /> Chờ duyệt {pendingOT.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingOT.length}</span>}
                    </button>
                )}
            </div>

            {/* My OT Tab */}
            {activeTab === 'my-ot' && (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Ngày</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Thời gian</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Số giờ</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Lý do</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Trạng thái</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8"><div className="spinner mx-auto"></div></td></tr>
                            ) : myOT.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-slate-400">Chưa có đăng ký OT nào</td></tr>
                            ) : (
                                myOT.map(ot => (
                                    <tr key={ot.id} className="border-t border-slate-200 hover:bg-slate-50">
                                        <td className="py-3 px-4 text-slate-700">{ot.date}</td>
                                        <td className="py-3 px-4 text-center text-slate-600">{ot.start_time} - {ot.end_time}</td>
                                        <td className="py-3 px-4 text-center font-medium text-slate-800">{ot.hours}h</td>
                                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{ot.reason}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${OT_STATUS[ot.status]?.color}`}>
                                                {OT_STATUS[ot.status]?.label}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {ot.status === 'PENDING' && (
                                                <button onClick={() => handleCancel(ot.id)} className="text-red-500 hover:text-red-700 text-sm">
                                                    Hủy
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pending Tab */}
            {activeTab === 'pending' && isManager && (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Nhân viên</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Ngày</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Thời gian</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Số giờ</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Lý do</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8"><div className="spinner mx-auto"></div></td></tr>
                            ) : pendingOT.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-slate-400">Không có đăng ký nào chờ duyệt</td></tr>
                            ) : (
                                pendingOT.map(ot => (
                                    <tr key={ot.id} className="border-t border-slate-200 hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-slate-800">{ot.user.name}</p>
                                            <p className="text-xs text-slate-500">{ot.user.department}</p>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-700">{ot.date}</td>
                                        <td className="py-3 px-4 text-center text-slate-600">{ot.start_time} - {ot.end_time}</td>
                                        <td className="py-3 px-4 text-center font-medium text-slate-800">{ot.hours}h</td>
                                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{ot.reason}</td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleApprove(ot.id)} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={() => setRejectModal({ show: true, otId: ot.id })} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create OT Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Timer size={24} className="text-orange-500" /> Đăng ký OT
                        </h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày</label>
                                <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="input" required min={format(new Date(), 'yyyy-MM-dd')} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Bắt đầu</label>
                                    <input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} className="input" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Kết thúc</label>
                                    <input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} className="input" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Lý do</label>
                                <textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} className="input" rows="3" required placeholder="Mô tả công việc OT..." />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Hủy</button>
                                <button type="submit" className="btn-primary flex-1">Gửi đăng ký</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal.show && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setRejectModal({ show: false, otId: null })}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Từ chối OT</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Lý do từ chối</label>
                            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="input" rows="3" placeholder="Nhập lý do..." />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setRejectModal({ show: false, otId: null })} className="btn-secondary flex-1">Hủy</button>
                            <button onClick={handleReject} className="btn-danger flex-1">Từ chối</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
