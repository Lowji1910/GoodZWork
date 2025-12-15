import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { projectAPI, userAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const KANBAN_COLUMNS = [
    { id: 'TODO', label: 'Chờ xử lý', bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
    { id: 'ASSIGNED', label: 'Đã giao', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
    { id: 'IN_PROGRESS', label: 'Đang làm', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    { id: 'COMPLETED', label: 'Hoàn thành', bgColor: 'bg-green-50', textColor: 'text-green-700' }
]

export default function ProjectDetailPage() {
    const { projectId } = useParams()
    const navigate = useNavigate()
    const { hasRole } = useAuth()

    const [project, setProject] = useState(null)
    const [tasks, setTasks] = useState([])
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showTaskModal, setShowTaskModal] = useState(false)
    const [showMemberModal, setShowMemberModal] = useState(false)
    const [selectedTask, setSelectedTask] = useState(null)
    const [availableUsers, setAvailableUsers] = useState([])

    const canManage = hasRole(['SUPER_ADMIN', 'HR_MANAGER', 'LEADER'])

    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        deadline: '',
        assigned_to: ''
    })

    useEffect(() => {
        loadData()
    }, [projectId])

    const loadData = async () => {
        try {
            const [projectRes, tasksRes, membersRes] = await Promise.all([
                projectAPI.getProject(projectId),
                projectAPI.getProjectTasks(projectId),
                projectAPI.getProjectMembers(projectId)
            ])
            setProject(projectRes.data)
            setTasks(tasksRes.data)
            setMembers(membersRes.data)
        } catch (error) {
            toast.error('Không thể tải dữ liệu dự án')
        } finally {
            setLoading(false)
        }
    }

    const loadAvailableUsers = async () => {
        try {
            const response = await userAPI.searchUsers('')
            setAvailableUsers(response.data)
        } catch (error) {
            console.error('Failed to load users:', error)
        }
    }

    const handleCreateTask = async () => {
        if (!newTask.title.trim()) {
            toast.error('Vui lòng nhập tiêu đề task')
            return
        }
        try {
            await projectAPI.createTask(projectId, newTask)
            toast.success('Tạo task thành công!')
            setShowTaskModal(false)
            setNewTask({ title: '', description: '', priority: 'MEDIUM', deadline: '', assigned_to: '' })
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Tạo task thất bại')
        }
    }

    const handleUpdateTaskStatus = async (taskId, newStatus) => {
        try {
            await projectAPI.updateTask(taskId, { status: newStatus })
            toast.success('Cập nhật trạng thái thành công')
            loadData()
        } catch (error) {
            toast.error('Cập nhật thất bại')
        }
    }

    const handleDeleteTask = async (taskId) => {
        if (!confirm('Bạn có chắc muốn xóa task này?')) return
        try {
            await projectAPI.deleteTask(taskId)
            toast.success('Đã xóa task')
            loadData()
        } catch (error) {
            toast.error('Xóa task thất bại')
        }
    }

    const handleAddMembers = async (memberIds) => {
        try {
            await projectAPI.addProjectMembers(projectId, memberIds)
            toast.success('Đã thêm thành viên')
            setShowMemberModal(false)
            loadData()
        } catch (error) {
            toast.error('Thêm thành viên thất bại')
        }
    }

    const handleRemoveMember = async (memberId) => {
        if (!confirm('Xóa thành viên này khỏi dự án?')) return
        try {
            await projectAPI.removeProjectMember(projectId, memberId)
            toast.success('Đã xóa thành viên')
            loadData()
        } catch (error) {
            toast.error('Xóa thành viên thất bại')
        }
    }

    const getTasksByStatus = (status) => {
        return tasks.filter(t => t.status === status)
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
        return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>
    }

    if (!project) {
        return <div className="glass-card p-8 text-center"><p className="text-slate-500">Không tìm thấy dự án</p></div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button onClick={() => navigate('/projects')} className="text-slate-500 hover:text-slate-800 transition-colors">
                                ← Quay lại
                            </button>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">{project.name}</h1>
                        <p className="text-slate-500">{project.description || 'Không có mô tả'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm ${project.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-700'
                            }`}>
                            {project.status}
                        </span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-slate-100 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-slate-800">{project.task_stats?.total || 0}</p>
                        <p className="text-sm text-slate-500">Tổng tasks</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{project.task_stats?.in_progress || 0}</p>
                        <p className="text-sm text-slate-500">Đang làm</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{project.task_stats?.completed || 0}</p>
                        <p className="text-sm text-slate-500">Hoàn thành</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-purple-600">{members.length}</p>
                        <p className="text-sm text-slate-500">Thành viên</p>
                    </div>
                </div>
            </div>

            {/* Members Section */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">👥 Thành viên</h2>
                    {canManage && (
                        <button onClick={() => { setShowMemberModal(true); loadAvailableUsers(); }} className="btn-secondary text-sm">
                            + Thêm
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-3">
                    {members.length === 0 ? (
                        <p className="text-slate-500 text-sm">Chưa có thành viên</p>
                    ) : (
                        members.map(member => (
                            <div key={member.id} className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                                    {member.avatar ? (
                                        <img src={`${API_URL}${member.avatar}`} className="w-full h-full object-cover" />
                                    ) : (
                                        member.full_name?.[0] || '?'
                                    )}
                                </div>
                                <span className="text-sm text-slate-700">{member.full_name}</span>
                                {canManage && (
                                    <button onClick={() => handleRemoveMember(member.id)} className="text-slate-400 hover:text-red-500 ml-1">×</button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Kanban Board */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">📋 Kanban Board</h2>
                    {canManage && (
                        <button onClick={() => setShowTaskModal(true)} className="btn-primary text-sm">+ Tạo task</button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {KANBAN_COLUMNS.map(column => (
                        <div key={column.id} className={`${column.bgColor} rounded-xl p-4 min-h-[300px]`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`font-medium ${column.textColor}`}>{column.label}</h3>
                                <span className="text-xs bg-white/80 text-slate-600 px-2 py-1 rounded-full shadow-sm">
                                    {getTasksByStatus(column.id).length}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {getTasksByStatus(column.id).map(task => (
                                    <div
                                        key={task.id}
                                        className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-slate-200"
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-sm">{getPriorityIcon(task.priority)}</span>
                                            {canManage && column.id !== 'COMPLETED' && (
                                                <div className="flex gap-1">
                                                    {column.id === 'TODO' && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task.id, 'ASSIGNED') }} className="text-xs text-yellow-600 hover:underline font-medium">→</button>
                                                    )}
                                                    {column.id === 'ASSIGNED' && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task.id, 'IN_PROGRESS') }} className="text-xs text-blue-600 hover:underline font-medium">→</button>
                                                    )}
                                                    {column.id === 'IN_PROGRESS' && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task.id, 'COMPLETED') }} className="text-xs text-green-600 hover:underline font-medium">✓</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="font-medium text-sm text-slate-800 mb-1">{task.title}</h4>
                                        {task.assigned_to && (
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <span>👤</span>
                                                <span>{task.assigned_to.full_name}</span>
                                            </div>
                                        )}
                                        {task.deadline && (
                                            <p className="text-xs text-slate-400 mt-1">📅 {format(new Date(task.deadline), 'dd/MM')}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Task Modal */}
            {showTaskModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Tạo task mới</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Tiêu đề *</label>
                                <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Mô tả</label>
                                <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 h-24 resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Ưu tiên</label>
                                    <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3">
                                        <option value="LOW">🟢 Thấp</option>
                                        <option value="MEDIUM">🟡 Trung bình</option>
                                        <option value="HIGH">🟠 Cao</option>
                                        <option value="URGENT">🔴 Khẩn cấp</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Deadline</label>
                                    <input type="date" value={newTask.deadline} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Giao cho</label>
                                <select value={newTask.assigned_to} onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3">
                                    <option value="">-- Chọn người --</option>
                                    {members.map(m => (<option key={m.id} value={m.id}>{m.full_name}</option>))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setShowTaskModal(false)} className="flex-1 btn-secondary">Hủy</button>
                            <button onClick={handleCreateTask} className="flex-1 btn-primary">Tạo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {showMemberModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Thêm thành viên</h3>
                        <div className="space-y-2">
                            {availableUsers.filter(u => !members.find(m => m.id === u.id)).map(user => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors" onClick={() => handleAddMembers([user.id])}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">{user.full_name?.[0] || '?'}</div>
                                        <div>
                                            <p className="font-medium text-slate-800">{user.full_name}</p>
                                            <p className="text-xs text-slate-500">{user.department}</p>
                                        </div>
                                    </div>
                                    <span className="text-blue-600 text-sm font-medium">+ Thêm</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowMemberModal(false)} className="w-full btn-secondary mt-4">Đóng</button>
                    </div>
                </div>
            )}

            {/* Task Detail Modal */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">{selectedTask.title}</h3>
                            <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Trạng thái</p>
                                <span className={`px-3 py-1 rounded-full text-sm ${selectedTask.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                        selectedTask.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                            'bg-slate-100 text-slate-700'
                                    }`}>{selectedTask.status}</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Mô tả</p>
                                <p className="text-slate-800">{selectedTask.description || '—'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Ưu tiên</p>
                                    <p className="text-slate-800">{getPriorityIcon(selectedTask.priority)} {selectedTask.priority}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Deadline</p>
                                    <p className="text-slate-800">{selectedTask.deadline ? format(new Date(selectedTask.deadline), 'dd/MM/yyyy') : '—'}</p>
                                </div>
                            </div>
                            {selectedTask.assigned_to && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Người thực hiện</p>
                                    <p className="text-slate-800">👤 {selectedTask.assigned_to.full_name}</p>
                                </div>
                            )}
                            {selectedTask.progress > 0 && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Tiến độ</p>
                                    <div className="bg-slate-200 rounded-full h-2">
                                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full" style={{ width: `${selectedTask.progress}%` }} />
                                    </div>
                                    <p className="text-right text-sm text-slate-600 mt-1">{selectedTask.progress}%</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4 mt-6">
                            {canManage && (
                                <button onClick={() => { handleDeleteTask(selectedTask.id); setSelectedTask(null); }} className="flex-1 btn-danger">Xóa</button>
                            )}
                            <button onClick={() => setSelectedTask(null)} className="flex-1 btn-secondary">Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
