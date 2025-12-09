import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { attendanceAPI, projectAPI } from '../api'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function DashboardPage() {
    const { user, hasRole } = useAuth()
    const [todayStatus, setTodayStatus] = useState(null)
    const [performance, setPerformance] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadDashboardData()
    }, [])

    const loadDashboardData = async () => {
        try {
            // Load today's attendance status
            const attendanceRes = await attendanceAPI.getTodayStatus()
            setTodayStatus(attendanceRes.data)

            // Load employee performance (for leaders/admins)
            if (hasRole(['SUPER_ADMIN', 'HR_MANAGER', 'LEADER'])) {
                const perfRes = await projectAPI.getEmployeePerformance()
                setPerformance(perfRes.data)
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
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="glass-card p-6">
                <h1 className="text-2xl font-bold mb-2">
                    Xin chào, {user?.full_name || 'Bạn'}! 👋
                </h1>
                <p className="text-slate-400">
                    {format(new Date(), "EEEE, 'ngày' dd 'tháng' MM, yyyy", { locale: vi })}
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today Status */}
                <div className="glass-card p-6 card-hover">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-3xl">⏰</span>
                        <span className={`px-3 py-1 rounded-full text-sm ${todayStatus?.checked_in ? 'status-active' : 'status-pending'
                            }`}>
                            {todayStatus?.checked_in ? 'Đã chấm công' : 'Chưa chấm công'}
                        </span>
                    </div>
                    <h3 className="text-lg font-semibold">Chấm công hôm nay</h3>
                    {todayStatus?.checkin_time && (
                        <p className="text-slate-400 text-sm mt-1">
                            Check-in: {format(new Date(todayStatus.checkin_time), 'HH:mm')}
                        </p>
                    )}
                    {todayStatus?.checkout_time && (
                        <p className="text-slate-400 text-sm">
                            Check-out: {format(new Date(todayStatus.checkout_time), 'HH:mm')}
                        </p>
                    )}
                </div>

                {/* Tasks */}
                <div className="glass-card p-6 card-hover">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-3xl">✅</span>
                        <span className="text-2xl font-bold text-blue-400">5</span>
                    </div>
                    <h3 className="text-lg font-semibold">Công việc đang làm</h3>
                    <p className="text-slate-400 text-sm mt-1">2 việc cần hoàn thành hôm nay</p>
                </div>

                {/* Messages */}
                <div className="glass-card p-6 card-hover">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-3xl">💬</span>
                        <span className="text-2xl font-bold text-green-400">3</span>
                    </div>
                    <h3 className="text-lg font-semibold">Tin nhắn chưa đọc</h3>
                    <p className="text-slate-400 text-sm mt-1">Từ 2 cuộc trò chuyện</p>
                </div>

                {/* Projects */}
                <div className="glass-card p-6 card-hover">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-3xl">📁</span>
                        <span className="text-2xl font-bold text-purple-400">2</span>
                    </div>
                    <h3 className="text-lg font-semibold">Dự án đang tham gia</h3>
                    <p className="text-slate-400 text-sm mt-1">1 dự án sắp đến deadline</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Pie Chart */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4">📊 Tỷ lệ chấm công hôm nay</h3>
                    <ResponsiveContainer width="100%" height={300}>
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
                    <h3 className="text-lg font-semibold mb-4">📈 Thống kê chấm công theo tháng</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="month" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #334155',
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
            {hasRole(['SUPER_ADMIN', 'HR_MANAGER', 'LEADER']) && performance.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4">👥 Hiệu suất nhân viên</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-3 px-4">Nhân viên</th>
                                    <th className="text-center py-3 px-4">Tổng task</th>
                                    <th className="text-center py-3 px-4">Hoàn thành</th>
                                    <th className="text-center py-3 px-4">Đang làm</th>
                                    <th className="text-center py-3 px-4">Tỷ lệ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performance.slice(0, 5).map((emp) => (
                                    <tr key={emp.user_id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                                    {emp.full_name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{emp.full_name}</p>
                                                    <p className="text-xs text-slate-400">{emp.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center py-3 px-4">{emp.total_tasks}</td>
                                        <td className="text-center py-3 px-4 text-green-400">{emp.completed_tasks}</td>
                                        <td className="text-center py-3 px-4 text-blue-400">{emp.in_progress_tasks}</td>
                                        <td className="text-center py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-sm ${emp.completion_rate >= 80 ? 'bg-green-500/20 text-green-400' :
                                                    emp.completion_rate >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-red-500/20 text-red-400'
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
