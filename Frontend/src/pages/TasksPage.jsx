import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { projectAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'

export default function TasksPage() {
    const { user, hasRole } = useAuth()
    const [tasks, setTasks] = useState([])
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)
    const [selectedTask, setSelectedTask] = useState(null)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectReason, setRejectReason] = useState('')

    useEffect(() => {
        loadTasks()
    }, [filter])

    const loadTasks = async () => {
        try {
            const status = filter === 'all' ? null : filter
            const response = await projectAPI.getMyTasks(status)
            setTasks(response.data)
        } catch (error) {
            console.error('Failed to load tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAcceptTask = async (taskId) => {
        try {
            await projectAPI.respondToTask(taskId, true)
            toast.success('Đã nhận việc!')
            loadTasks()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Thao tác thất bại')
        }
    }

    const handleRejectTask = async () => {
        if (!rejectReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối')
            return
        }

        try {
            await projectAPI.respondToTask(selectedTask.id, false, rejectReason)
            toast.success('Đã từ chối task')
            setShowRejectModal(false)
            setRejectReason('')
            setSelectedTask(null)
            loadTasks()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Thao tác thất bại')
        }
    }

    const handleUpdateProgress = async (taskId, progress) => {
        try {
            await projectAPI.updateTaskProgress(taskId, progress)
            toast.success(`Đã cập nhật tiến độ: ${progress}%`)
            loadTasks()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Cập nhật thất bại')
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-500/20 text-green-400 border-green-500/30'
            case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'ASSIGNED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            case 'REJECTED': return 'bg-red-500/20 text-red-400 border-red-500/30'
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
        }
    }

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'URGENT': return '🔴'
            case 'HIGH': return '🟠'
            case 'MEDIUM': return '🟡'
            case 'LOW': return '🟢'
            default: return '⚪'
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">✅ Công việc của tôi</h1>
                    <p className="text-slate-400">Quản lý và theo dõi tiến độ công việc</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-xl transition-all ${filter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        {status === 'all' ? 'Tất cả' :
                            status === 'ASSIGNED' ? 'Chờ nhận' :
                                status === 'IN_PROGRESS' ? 'Đang làm' :
                                    status === 'COMPLETED' ? 'Hoàn thành' : 'Từ chối'}
                    </button>
                ))}
            </div>

            {/* Task List */}
            <div className="grid gap-4">
                {tasks.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <p className="text-4xl mb-4">📋</p>
                        <p className="text-slate-400">Không có công việc nào</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className="glass-card p-6 card-hover">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span>{getPriorityIcon(task.priority)}</span>
                                        <h3 className="text-lg font-semibold">{task.title}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(task.status)}`}>
                                            {task.status === 'ASSIGNED' ? 'Chờ nhận' :
                                                task.status === 'IN_PROGRESS' ? 'Đang làm' :
                                                    task.status === 'COMPLETED' ? 'Hoàn thành' : task.status}
                                        </span>
                                    </div>

                                    <p className="text-slate-400 text-sm mb-3">{task.description}</p>

                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <span className="text-slate-400">
                                            📁 {task.project_name}
                                        </span>
                                        {task.deadline && (
                                            <span className="text-slate-400">
                                                📅 {format(new Date(task.deadline), 'dd/MM/yyyy')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    {task.status === 'IN_PROGRESS' && (
                                        <div className="mt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-slate-400">Tiến độ</span>
                                                <span className="text-sm font-medium">{task.progress}%</span>
                                            </div>
                                            <div className="bg-slate-700 rounded-full h-2 mb-2">
                                                <div
                                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all"
                                                    style={{ width: `${task.progress}%` }}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                {[25, 50, 75, 100].map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => handleUpdateProgress(task.id, p)}
                                                        className={`text-xs px-2 py-1 rounded ${task.progress >= p
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                            }`}
                                                    >
                                                        {p}%
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Rejection Reason */}
                                    {task.status === 'REJECTED' && task.rejection_reason && (
                                        <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                            <p className="text-sm text-red-400">
                                                <strong>Lý do từ chối:</strong> {task.rejection_reason}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {task.status === 'ASSIGNED' && (
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleAcceptTask(task.id)}
                                            className="btn-primary text-sm px-4 py-2"
                                        >
                                            ✓ Nhận việc
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedTask(task)
                                                setShowRejectModal(true)
                                            }}
                                            className="btn-danger text-sm px-4 py-2"
                                        >
                                            ✗ Từ chối
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Từ chối công việc</h3>
                        <p className="text-slate-400 mb-4">
                            Bạn đang từ chối: <strong>{selectedTask?.title}</strong>
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Nhập lý do từ chối..."
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false)
                                    setRejectReason('')
                                    setSelectedTask(null)
                                }}
                                className="flex-1 btn-secondary"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleRejectTask}
                                className="flex-1 btn-danger"
                            >
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
