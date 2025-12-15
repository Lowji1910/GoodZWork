import { useState, useEffect } from 'react'
import { contractsAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { FileText, Plus, AlertTriangle, Check, X, Eye } from 'lucide-react'

const CONTRACT_TYPES = {
    PROBATION: { label: 'Thử việc', color: 'bg-yellow-100 text-yellow-700' },
    FIXED_TERM: { label: 'Có thời hạn', color: 'bg-blue-100 text-blue-700' },
    INDEFINITE: { label: 'Không thời hạn', color: 'bg-green-100 text-green-700' }
}

const STATUS_LABELS = {
    ACTIVE: { label: 'Hiệu lực', color: 'bg-green-100 text-green-700' },
    EXPIRED: { label: 'Hết hạn', color: 'bg-slate-100 text-slate-700' },
    TERMINATED: { label: 'Chấm dứt', color: 'bg-red-100 text-red-700' }
}

export default function ContractsPage() {
    const { hasRole } = useAuth()
    const [activeTab, setActiveTab] = useState('all')
    const [loading, setLoading] = useState(true)
    const [contracts, setContracts] = useState([])
    const [expiringContracts, setExpiringContracts] = useState([])
    const [myContracts, setMyContracts] = useState([])
    const [stats, setStats] = useState(null)

    const isManager = hasRole(['SUPER_ADMIN', 'HR_MANAGER'])

    useEffect(() => {
        loadData()
    }, [activeTab])

    const loadData = async () => {
        setLoading(true)
        try {
            if (isManager) {
                if (activeTab === 'all') {
                    const res = await contractsAPI.getAll({})
                    setContracts(res.data)
                } else if (activeTab === 'expiring') {
                    const res = await contractsAPI.getExpiring(30)
                    setExpiringContracts(res.data)
                }
                const statsRes = await contractsAPI.getStats()
                setStats(statsRes.data)
            } else {
                const res = await contractsAPI.getMyContracts()
                setMyContracts(res.data)
            }
        } catch (error) {
            console.error('Failed to load contracts:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatSalary = (salary) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(salary)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileText size={28} className="text-indigo-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Hợp đồng lao động</h1>
                        <p className="text-slate-500">Quản lý hợp đồng nhân viên</p>
                    </div>
                </div>
                {isManager && (
                    <button className="btn-primary flex items-center gap-2">
                        <Plus size={18} /> Tạo hợp đồng
                    </button>
                )}
            </div>

            {/* Stats for Managers */}
            {isManager && stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="glass-card p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Tổng HĐ</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                        <p className="text-sm text-slate-500">Hiệu lực</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-3xl font-bold text-slate-500">{stats.expired}</p>
                        <p className="text-sm text-slate-500">Hết hạn</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-3xl font-bold text-red-600">{stats.terminated}</p>
                        <p className="text-sm text-slate-500">Chấm dứt</p>
                    </div>
                    <div className="glass-card p-4 text-center border-2 border-orange-300">
                        <p className="text-3xl font-bold text-orange-600">{stats.expiring_30_days}</p>
                        <p className="text-sm text-orange-500 flex items-center justify-center gap-1">
                            <AlertTriangle size={14} /> Sắp hết hạn
                        </p>
                    </div>
                </div>
            )}

            {/* Tabs for Managers */}
            {isManager && (
                <div className="flex gap-2 border-b border-slate-200 pb-2">
                    <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <FileText size={18} /> Tất cả
                    </button>
                    <button onClick={() => setActiveTab('expiring')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'expiring' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <AlertTriangle size={18} /> Sắp hết hạn
                        {stats?.expiring_30_days > 0 && (
                            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.expiring_30_days}</span>
                        )}
                    </button>
                </div>
            )}

            {/* All Contracts Tab */}
            {isManager && activeTab === 'all' && (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Nhân viên</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Loại HĐ</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Vị trí</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Thời hạn</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-700">Lương</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-700">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8"><div className="spinner mx-auto"></div></td></tr>
                            ) : contracts.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-slate-400">Chưa có hợp đồng nào</td></tr>
                            ) : (
                                contracts.map(c => (
                                    <tr key={c.id} className="border-t border-slate-200 hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-slate-800">{c.employee.name}</p>
                                            <p className="text-xs text-slate-500">{c.employee.email}</p>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${CONTRACT_TYPES[c.contract_type]?.color}`}>
                                                {CONTRACT_TYPES[c.contract_type]?.label}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-600">{c.position}</td>
                                        <td className="py-3 px-4 text-center text-slate-600 text-sm">
                                            {c.start_date} → {c.end_date || 'Vô thời hạn'}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-slate-800">{formatSalary(c.salary)}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_LABELS[c.status]?.color}`}>
                                                {STATUS_LABELS[c.status]?.label}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Expiring Contracts Tab */}
            {isManager && activeTab === 'expiring' && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8"><div className="spinner"></div></div>
                    ) : expiringContracts.length === 0 ? (
                        <div className="glass-card p-8 text-center text-slate-400">
                            <Check size={48} className="mx-auto mb-4 text-green-400" />
                            <p>Không có hợp đồng nào sắp hết hạn trong 30 ngày tới</p>
                        </div>
                    ) : (
                        expiringContracts.map(c => (
                            <div key={c.id} className="glass-card p-4 border-l-4 border-orange-400">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-800">{c.employee.name}</p>
                                        <p className="text-sm text-slate-500">{c.position} • {CONTRACT_TYPES[c.contract_type]?.label}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-orange-600">{c.days_remaining}</p>
                                        <p className="text-xs text-orange-500">ngày còn lại</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <button className="btn-primary text-sm py-1 px-3">Gia hạn</button>
                                    <button className="btn-secondary text-sm py-1 px-3">Chấm dứt</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* My Contracts (for employees) */}
            {!isManager && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8"><div className="spinner"></div></div>
                    ) : myContracts.length === 0 ? (
                        <div className="glass-card p-8 text-center text-slate-400">
                            <FileText size={48} className="mx-auto mb-4 opacity-30" />
                            <p>Bạn chưa có hợp đồng nào</p>
                        </div>
                    ) : (
                        myContracts.map(c => (
                            <div key={c.id} className="glass-card p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${CONTRACT_TYPES[c.contract_type]?.color}`}>
                                            {CONTRACT_TYPES[c.contract_type]?.label}
                                        </span>
                                        <p className="text-lg font-semibold text-slate-800 mt-2">{c.position}</p>
                                        <p className="text-sm text-slate-500">{c.start_date} → {c.end_date || 'Vô thời hạn'}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_LABELS[c.status]?.color}`}>
                                            {STATUS_LABELS[c.status]?.label}
                                        </span>
                                        <p className="text-xl font-bold text-slate-800 mt-2">{formatSalary(c.salary)}</p>
                                        <p className="text-xs text-slate-500">/ tháng</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
