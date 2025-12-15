import { useState, useEffect } from 'react'
import { kpiAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { Target, Plus, Check, X, Eye, Trophy } from 'lucide-react'
import { format } from 'date-fns'

const PERIOD_LABELS = {
    MONTHLY: 'Tháng',
    QUARTERLY: 'Quý',
    YEARLY: 'Năm'
}

const STATUS_LABELS = {
    DRAFT: { label: 'Nháp', color: 'bg-slate-100 text-slate-700' },
    SUBMITTED: { label: 'Đã gửi', color: 'bg-blue-100 text-blue-700' },
    REVIEWED: { label: 'Đã review', color: 'bg-yellow-100 text-yellow-700' },
    APPROVED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700' }
}

export default function KPIPage() {
    const { hasRole } = useAuth()
    const [activeTab, setActiveTab] = useState('my-kpi')
    const [loading, setLoading] = useState(true)
    const [myReviews, setMyReviews] = useState([])
    const [teamReviews, setTeamReviews] = useState([])
    const [year, setYear] = useState(new Date().getFullYear())

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [selectedReview, setSelectedReview] = useState(null)

    const isManager = hasRole(['SUPER_ADMIN', 'HR_MANAGER', 'LEADER'])

    useEffect(() => {
        loadData()
    }, [activeTab, year])

    const loadData = async () => {
        setLoading(true)
        try {
            if (activeTab === 'my-kpi') {
                const res = await kpiAPI.getMyReviews(year)
                setMyReviews(res.data)
            } else if (activeTab === 'team' && isManager) {
                const res = await kpiAPI.getTeamReviews(year)
                setTeamReviews(res.data)
            }
        } catch (error) {
            console.error('Failed to load KPI data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getScoreColor = (score) => {
        if (score >= 90) return 'text-green-600 bg-green-100'
        if (score >= 70) return 'text-yellow-600 bg-yellow-100'
        return 'text-red-600 bg-red-100'
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Target size={28} className="text-purple-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">KPI & Hiệu suất</h1>
                        <p className="text-slate-500">Đánh giá và theo dõi mục tiêu</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700">
                        {[2023, 2024, 2025].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
                        <Plus size={18} /> Tạo KPI
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
                <button onClick={() => setActiveTab('my-kpi')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'my-kpi' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Target size={18} /> KPI của tôi
                </button>
                {isManager && (
                    <button onClick={() => setActiveTab('team')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'team' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Trophy size={18} /> Team
                    </button>
                )}
            </div>

            {/* My KPI Tab */}
            {activeTab === 'my-kpi' && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8"><div className="spinner"></div></div>
                    ) : myReviews.length === 0 ? (
                        <div className="glass-card p-8 text-center text-slate-400">
                            <Target size={48} className="mx-auto mb-4 opacity-30" />
                            <p>Chưa có KPI review nào</p>
                        </div>
                    ) : (
                        myReviews.map(review => (
                            <div key={review.id} className="glass-card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_LABELS[review.status]?.color}`}>
                                            {STATUS_LABELS[review.status]?.label}
                                        </span>
                                        <p className="text-lg font-semibold text-slate-800 mt-1">
                                            {PERIOD_LABELS[review.period]} {review.period_start.split('-')[0]}
                                        </p>
                                        <p className="text-sm text-slate-500">{review.period_start} → {review.period_end}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-3xl font-bold px-4 py-2 rounded-lg ${getScoreColor(review.overall_score)}`}>
                                            {review.overall_score}%
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">Điểm tổng</p>
                                    </div>
                                </div>

                                {/* Goals */}
                                <div className="space-y-2">
                                    {review.goals.map((goal, idx) => (
                                        <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-700">{goal.title}</p>
                                                <p className="text-xs text-slate-500">Mục tiêu: {goal.target} | Đạt: {goal.achievement || 0}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreColor(goal.score || 0)}`}>
                                                {goal.score || 0}%
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions */}
                                {review.status === 'DRAFT' && (
                                    <button onClick={() => setSelectedReview(review)} className="btn-primary mt-4 w-full">
                                        Cập nhật & Submit
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && isManager && (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Nhân viên</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Kỳ</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Điểm</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Trạng thái</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-8"><div className="spinner mx-auto"></div></td></tr>
                            ) : teamReviews.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-8 text-slate-400">Không có KPI review</td></tr>
                            ) : (
                                teamReviews.map(review => (
                                    <tr key={review.id} className="border-t border-slate-200 hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-slate-800">{review.employee.name}</p>
                                            <p className="text-xs text-slate-500">{review.employee.department}</p>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-600">
                                            {PERIOD_LABELS[review.period]} {review.period_start.split('-')[0]}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-3 py-1 rounded font-bold ${getScoreColor(review.overall_score)}`}>
                                                {review.overall_score}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_LABELS[review.status]?.color}`}>
                                                {STATUS_LABELS[review.status]?.label}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button className="text-blue-600 hover:underline text-sm flex items-center gap-1 mx-auto">
                                                <Eye size={14} /> Xem
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal - Simplified */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Target size={24} className="text-purple-500" /> Tạo KPI Review
                        </h3>
                        <p className="text-slate-500 mb-4">Tính năng này sẽ được phát triển thêm trong phiên bản tiếp theo.</p>
                        <button onClick={() => setShowCreateModal(false)} className="btn-secondary w-full">Đóng</button>
                    </div>
                </div>
            )}
        </div>
    )
}
