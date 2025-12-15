import { useState, useEffect } from 'react'
import { attendanceAPI, leaveAPI, exportAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { BarChart3, Users, Palmtree, Download } from 'lucide-react'

export default function ReportsPage() {
    const { hasRole } = useAuth()
    const [activeTab, setActiveTab] = useState('attendance')
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [year, setYear] = useState(new Date().getFullYear())
    const [loading, setLoading] = useState(true)

    const [myReport, setMyReport] = useState(null)
    const [teamReport, setTeamReport] = useState(null)
    const [leaveStats, setLeaveStats] = useState(null)

    const isManager = hasRole(['SUPER_ADMIN', 'HR_MANAGER', 'LEADER'])

    useEffect(() => {
        loadData()
    }, [month, year])

    const loadData = async () => {
        setLoading(true)
        try {
            // My attendance report
            const myRes = await attendanceAPI.getMonthlyReport(month, year)
            setMyReport(myRes.data)

            // Team report for managers
            if (isManager) {
                try {
                    const teamRes = await attendanceAPI.getTeamReport(month, year)
                    setTeamReport(teamRes.data)
                } catch (e) { }

                try {
                    const leaveRes = await leaveAPI.getLeaveStats(year)
                    setLeaveStats(leaveRes.data)
                } catch (e) { }
            }
        } catch (error) {
            console.error('Failed to load reports:', error)
        } finally {
            setLoading(false)
        }
    }

    const attendancePieData = myReport ? [
        { name: 'Đúng giờ', value: myReport.on_time_days, color: '#22c55e' },
        { name: 'Đi muộn', value: myReport.late_days, color: '#f59e0b' }
    ] : []

    const leavePieData = leaveStats ? [
        { name: 'Chờ duyệt', value: leaveStats.pending, color: '#f59e0b' },
        { name: 'Đã duyệt', value: leaveStats.approved, color: '#22c55e' },
        { name: 'Từ chối', value: leaveStats.rejected, color: '#ef4444' }
    ] : []

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BarChart3 size={28} className="text-blue-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Báo cáo & Thống kê</h1>
                        <p className="text-slate-500">Xem báo cáo chấm công và nghỉ phép</p>
                    </div>
                </div>
                {/* Controls */}
                <div className="flex items-center gap-3">
                    {/* Month/Year Selector */}
                    <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700">
                        {[...Array(12)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                        ))}
                    </select>
                    <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700">
                        {[2023, 2024, 2025].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    {/* Export Button */}
                    {isManager && (
                        <div className="relative group">
                            <button className="btn-secondary flex items-center gap-2">
                                <Download size={18} /> Xuất Excel
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                <button onClick={() => exportAPI.downloadAttendance(month, year)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Chấm công</button>
                                <button onClick={() => exportAPI.downloadLeaves(year)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Nghỉ phép</button>
                                <button onClick={() => exportAPI.downloadOvertime(month, year)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">OT</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
                <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'attendance' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                    <BarChart3 size={18} /> Chấm công
                </button>
                {isManager && (
                    <>
                        <button onClick={() => setActiveTab('team')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'team' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Users size={18} /> Team
                        </button>
                        <button onClick={() => setActiveTab('leave')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'leave' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Palmtree size={18} /> Nghỉ phép
                        </button>
                    </>
                )}
            </div>

            {/* My Attendance Tab */}
            {activeTab === 'attendance' && myReport && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="glass-card p-4 text-center">
                            <p className="text-3xl font-bold text-slate-800">{myReport.total_working_days}</p>
                            <p className="text-sm text-slate-500">Ngày làm việc</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <p className="text-3xl font-bold text-green-600">{myReport.on_time_days}</p>
                            <p className="text-sm text-slate-500">Đúng giờ</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <p className="text-3xl font-bold text-orange-600">{myReport.late_days}</p>
                            <p className="text-sm text-slate-500">Đi muộn</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <p className="text-3xl font-bold text-blue-600">{myReport.on_time_rate}%</p>
                            <p className="text-sm text-slate-500">Tỷ lệ đúng giờ</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-slate-700 mb-4">Thống kê chấm công</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={attendancePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {attendancePieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-slate-700 mb-4">Chi tiết theo ngày</h3>
                            <div className="max-h-[250px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-slate-100">
                                        <tr>
                                            <th className="text-left py-2 px-3">Ngày</th>
                                            <th className="text-center py-2 px-3">Check-in</th>
                                            <th className="text-center py-2 px-3">Check-out</th>
                                            <th className="text-center py-2 px-3">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(myReport.daily_data).map(([date, data]) => (
                                            <tr key={date} className="border-t border-slate-100">
                                                <td className="py-2 px-3 text-slate-700">{date}</td>
                                                <td className="py-2 px-3 text-center text-slate-600">{data.checkin || '—'}</td>
                                                <td className="py-2 px-3 text-center text-slate-600">{data.checkout || '—'}</td>
                                                <td className="py-2 px-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${data.status === 'ON_TIME' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {data.status === 'ON_TIME' ? 'Đúng giờ' : 'Muộn'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Report Tab */}
            {activeTab === 'team' && teamReport && (
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="glass-card p-4 text-center">
                            <p className="text-3xl font-bold text-slate-800">{teamReport.total_employees}</p>
                            <p className="text-sm text-slate-500">Nhân viên</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <p className="text-3xl font-bold text-blue-600">{teamReport.total_checkins}</p>
                            <p className="text-sm text-slate-500">Tổng lượt chấm công</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <p className="text-3xl font-bold text-green-600">{teamReport.overall_on_time_rate}%</p>
                            <p className="text-sm text-slate-500">Tỷ lệ đúng giờ chung</p>
                        </div>
                    </div>

                    {/* Employee Table */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-slate-700 mb-4">Xếp hạng nhân viên</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">#</th>
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Nhân viên</th>
                                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Số ngày</th>
                                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Đúng giờ</th>
                                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Muộn</th>
                                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Tỷ lệ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamReport.employees.map((emp, idx) => (
                                        <tr key={emp.id} className="border-t border-slate-200 hover:bg-slate-50">
                                            <td className="py-3 px-4 text-slate-600">{idx + 1}</td>
                                            <td className="py-3 px-4">
                                                <p className="font-medium text-slate-800">{emp.name}</p>
                                                <p className="text-xs text-slate-500">{emp.department}</p>
                                            </td>
                                            <td className="py-3 px-4 text-center text-slate-700">{emp.total_days}</td>
                                            <td className="py-3 px-4 text-center text-green-600 font-medium">{emp.on_time}</td>
                                            <td className="py-3 px-4 text-center text-orange-600">{emp.late}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${emp.on_time_rate >= 90 ? 'bg-green-100 text-green-700' :
                                                    emp.on_time_rate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {emp.on_time_rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Stats Tab */}
            {activeTab === 'leave' && leaveStats && (
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="glass-card p-4 text-center">
                            <p className="text-3xl font-bold text-slate-800">{leaveStats.total}</p>
                            <p className="text-sm text-slate-500">Tổng đơn</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <p className="text-3xl font-bold text-orange-600">{leaveStats.pending}</p>
                            <p className="text-sm text-slate-500">Chờ duyệt</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <p className="text-3xl font-bold text-green-600">{leaveStats.approved}</p>
                            <p className="text-sm text-slate-500">Đã duyệt</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <p className="text-3xl font-bold text-red-600">{leaveStats.rejected}</p>
                            <p className="text-sm text-slate-500">Từ chối</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-slate-700 mb-4">Trạng thái đơn</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={leavePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {leavePieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-slate-700 mb-4">Theo loại nghỉ</h3>
                            <div className="space-y-3">
                                {Object.entries(leaveStats.by_type || {}).map(([type, count]) => (
                                    <div key={type} className="flex items-center justify-between">
                                        <span className="text-slate-600">{type}</span>
                                        <span className="font-medium text-slate-800">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
