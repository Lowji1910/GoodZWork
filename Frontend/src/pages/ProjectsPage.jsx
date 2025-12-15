import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { projectAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'

export default function ProjectsPage() {
    const navigate = useNavigate()
    const { hasRole } = useAuth()
    const [projects, setProjects] = useState([])
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newProject, setNewProject] = useState({ name: '', description: '', deadline: '' })

    const canManage = hasRole(['SUPER_ADMIN', 'HR_MANAGER', 'LEADER'])

    useEffect(() => {
        loadProjects()
    }, [filter])

    const loadProjects = async () => {
        try {
            const status = filter === 'all' ? null : filter
            const response = await projectAPI.getProjects(status)
            setProjects(response.data)
        } catch (error) {
            console.error('Failed to load projects:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateProject = async () => {
        if (!newProject.name.trim()) {
            toast.error('Vui lòng nhập tên dự án')
            return
        }
        try {
            await projectAPI.createProject(newProject)
            toast.success('Tạo dự án thành công!')
            setShowCreateModal(false)
            setNewProject({ name: '', description: '', deadline: '' })
            loadProjects()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Tạo dự án thất bại')
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-500/20 text-green-400 border-green-500/30'
            case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'ON_HOLD': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
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
                    <h1 className="text-2xl font-bold">📁 Dự án</h1>
                    <p className="text-slate-400">Quản lý và theo dõi các dự án</p>
                </div>
                {canManage && (
                    <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                        + Tạo dự án
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-xl transition-all ${filter === status ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        {status === 'all' ? 'Tất cả' :
                            status === 'PLANNING' ? 'Lên kế hoạch' :
                                status === 'IN_PROGRESS' ? 'Đang thực hiện' :
                                    status === 'ON_HOLD' ? 'Tạm dừng' : 'Hoàn thành'}
                    </button>
                ))}
            </div>

            {/* Project Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.length === 0 ? (
                    <div className="col-span-full glass-card p-8 text-center">
                        <p className="text-4xl mb-4">📁</p>
                        <p className="text-slate-400">Chưa có dự án nào</p>
                    </div>
                ) : (
                    projects.map(project => (
                        <div
                            key={project.id}
                            className="glass-card p-6 card-hover cursor-pointer"
                            onClick={() => navigate(`/projects/${project.id}`)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <h3 className="text-lg font-semibold">{project.name}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(project.status)}`}>
                                    {project.status === 'IN_PROGRESS' ? 'Đang thực hiện' :
                                        project.status === 'COMPLETED' ? 'Hoàn thành' :
                                            project.status === 'ON_HOLD' ? 'Tạm dừng' : project.status}
                                </span>
                            </div>

                            <p className="text-slate-400 text-sm mb-4 line-clamp-2">{project.description || 'Không có mô tả'}</p>

                            {/* Progress */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-400">Tiến độ</span>
                                    <span>{project.progress || 0}%</span>
                                </div>
                                <div className="bg-slate-700 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all"
                                        style={{ width: `${project.progress || 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-4">
                                    <span className="text-slate-400">
                                        ✅ {project.completed_tasks || 0}/{project.total_tasks || 0} tasks
                                    </span>
                                </div>
                                {project.deadline && (
                                    <span className="text-slate-400">
                                        📅 {format(new Date(project.deadline), 'dd/MM/yyyy')}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Tạo dự án mới</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Tên dự án *</label>
                                <input
                                    type="text"
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
                                    placeholder="VD: Website E-commerce"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Mô tả</label>
                                <textarea
                                    value={newProject.description}
                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 h-24 resize-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Mô tả chi tiết về dự án..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Deadline</label>
                                <input
                                    type="date"
                                    value={newProject.deadline}
                                    onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 btn-secondary">Hủy</button>
                            <button onClick={handleCreateProject} className="flex-1 btn-primary">Tạo dự án</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
