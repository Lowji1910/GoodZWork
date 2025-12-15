import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { attendanceAPI, projectAPI, leaveAPI } from '../api'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function DashboardPage() {
    const navigate = useNavigate()
    const { user, hasRole } = useAuth()
    const [todayStatus, setTodayStatus] = useState(null)
    const [performance, setPerformance] = useState([])
    const [pendingLeaves, setPendingLeaves] = useState(0)
    const [leaveSummary, setLeaveSummary] = useState({ remaining: 0 })
    const [loading, setLoading] = useState(true)

    const isManager = hasRole(['SUPER_ADMIN', 'HR_MANAGER', 'LEADER'])

    useEffect(() => {
        loadDashboardData()
    }, [])

    const loadDashboardData = async () => {
        try {
            // Load today's attendance status
            const attendanceRes = await attendanceAPI.getTodayStatus()
            setTodayStatus(attendanceRes.data)

            // Load leave summary
            try {
                const leaveRes = await leaveAPI.getMyLeaves()
                setLeaveSummary(leaveRes.data.summary)
            } catch (e) { }

            // Load pending leaves count (for managers)
            if (isManager) {
                try {
                    const pendingRes = await leaveAPI.getPendingLeaves()
                    setPendingLeaves(pendingRes.data.length)
                } catch (e) { }

                // Load employee performance
                try {
                    const perfRes = await projectAPI.getEmployeePerformance()
                    setPerformance(perfRes.data || [])
                } catch (e) { }
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Sample data for charts
    const attendanceData = [
        { name: 'Đúng giờ', value: 85, color: '#22c55e' },
        { name: 'Đi muộn', value: 10, color: '#f59e0b' },
        { name: 'Vắng mặt', value: 5, color: '#ef4444' },
    ]

    const monthlyData = [
        { month: 'T1', onTime: 90, late: 8, absent: 2 },
        { month: 'T2', onTime: 88, late: 10, absent: 2 },
        { month: 'T3', onTime: 85, late: 12, absent: 3 },
        { month: 'T4', onTime: 87, late: 10, absent: 3 },
        { month: 'T5', onTime: 92, late: 6, absent: 2 },
        { month: 'T6', onTime: 89, late: 8, absent: 3 },
    ]

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>
    }

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-1">
                            Xin chào, {user?.full_name || 'Bạn'}! 👋
                        </h1>
                        <p className="text-slate-500">
                            {format(new Date(), "EEEE, 'ngày' dd 'tháng' MM, yyyy", { locale: vi })}
                        </p>
                    </div>
                    {/* Quick Actions */}
                    <div className="flex gap-2">
                        <button onClick={() => navigate('/attendance')} className="btn-primary text-sm">
                            ⏰ Chấm công
                        </button>
                        <button onClick={() => navigate('/leaves')} className="btn-secondary text-sm">
                            🏖️ Xin nghỉ
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today Status */}
                <div className="glass-card p-5 card-hover cursor-pointer" onClick={() => navigate('/attendance')}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">⏰</span>
                        <span className={`px-3 py-1 rounded-full text-xs ${todayStatus?.checked_in ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {todayStatus?.checked_in ? 'Đã chấm công' : 'Chưa chấm công'}
                        </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-700">Chấm công hôm nay</h3>
                    {todayStatus?.checkin_time && (
                        <p className="text-slate-500 text-sm mt-1">
                            In: {format(new Date(todayStatus.checkin_time), 'HH:mm')}
                            {todayStatus?.checkout_time && ` → Out: ${format(new Date(todayStatus.checkout_time), 'HH:mm')}`}
                        </p>
                    )}
                </div>

                {/* Leave Balance */}
                <div className="glass-card p-5 card-hover cursor-pointer" onClick={() => navigate('/leaves')}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">🏖️</span>
                        <span className="text-2xl font-bold text-blue-600">{leaveSummary.remaining}</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-700">Ngày phép còn lại</h3>
                    <p className="text-slate-500 text-sm mt-1">Đã dùng: {leaveSummary.total_used || 0}/{leaveSummary.annual_quota || 12} ngày</p>
                </div>

                {/* Tasks Widget */}
                <div className="glass-card p-5 card-hover cursor-pointer" onClick={() => navigate('/tasks')}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">✅</span>
                        <span className="text-2xl font-bold text-purple-600">—</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-700">Công việc của tôi</h3>
                    <p className="text-slate-500 text-sm mt-1">Xem danh sách tasks</p>
                </div>

                {/* HR Widget - Pending Leaves */}
                {isManager ? (
                    <div className="glass-card p-5 card-hover cursor-pointer" onClick={() => navigate('/leaves')}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-3xl">📋</span>
                            <span className={`text-2xl font-bold ${pendingLeaves > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {pendingLeaves}
                            </span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-700">Đơn chờ duyệt</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            {pendingLeaves > 0 ? 'Cần xem xét ngay' : 'Không có đơn mới'}
                        </p>
                    </div>
                ) : (
                    <div className="glass-card p-5 card-hover cursor-pointer" onClick={() => navigate('/projects')}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-3xl">📁</span>
                            <span className="text-2xl font-bold text-orange-600">—</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-700">Dự án</h3>
                        <p className="text-slate-500 text-sm mt-1">Xem các dự án</p>
                    </div>
                )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Pie Chart */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">📊 Tỷ lệ chấm công tháng này</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={attendanceData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {attendanceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Monthly Bar Chart */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">📈 Thống kê chấm công theo tháng</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#64748b" />
                            <YAxis stroke="#64748b" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="onTime" name="Đúng giờ" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="late" name="Đi muộn" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="absent" name="Vắng" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Employee Performance (Leaders/Admins only) */}
            {isManager && performance.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">👥 Hiệu suất nhân viên</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Nhân viên</th>
                                    <th className="text-center py-3 px-4 text-slate-700 font-semibold">Tổng task</th>
                                    <th className="text-center py-3 px-4 text-slate-700 font-semibold">Hoàn thành</th>
                                    <th className="text-center py-3 px-4 text-slate-700 font-semibold">Đang làm</th>
                                    <th className="text-center py-3 px-4 text-slate-700 font-semibold">Tỷ lệ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performance.slice(0, 5).map((emp) => (
                                    <tr key={emp.user_id} className="border-t border-slate-200 hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                                    {emp.full_name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{emp.full_name}</p>
                                                    <p className="text-xs text-slate-500">{emp.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center py-3 px-4 text-slate-700">{emp.total_tasks}</td>
                                        <td className="text-center py-3 px-4 text-green-600 font-medium">{emp.completed_tasks}</td>
                                        <td className="text-center py-3 px-4 text-blue-600">{emp.in_progress_tasks}</td>
                                        <td className="text-center py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs ${emp.completion_rate >= 80 ? 'bg-green-100 text-green-700' :
                                                emp.completion_rate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {emp.completion_rate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
