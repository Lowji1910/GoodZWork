import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import {
    LayoutDashboard,
    Clock,
    MessageCircle,
    FolderKanban,
    CheckSquare,
    Palmtree,
    BarChart3,
    Wallet,
    Users,
    ClipboardList,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Timer,
    Target,
    FileText
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'LEADER', 'EMPLOYEE'] },
    { path: '/attendance', label: 'Chấm công', icon: Clock, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'LEADER', 'EMPLOYEE'] },
    { path: '/chat', label: 'Chat', icon: MessageCircle, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'LEADER', 'EMPLOYEE'] },
    { path: '/projects', label: 'Dự án', icon: FolderKanban, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'LEADER', 'EMPLOYEE'] },
    { path: '/tasks', label: 'Công việc', icon: CheckSquare, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'LEADER', 'EMPLOYEE'] },
    { path: '/leaves', label: 'Nghỉ phép', icon: Palmtree, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'LEADER', 'EMPLOYEE'] },
    { path: '/overtime', label: 'OT', icon: Timer, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'LEADER', 'EMPLOYEE'] },
    { path: '/kpi', label: 'KPI', icon: Target, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'LEADER', 'EMPLOYEE'] },
    { path: '/contracts', label: 'Hợp đồng', icon: FileText, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'EMPLOYEE'] },
    { path: '/calendar', label: 'Lịch', icon: CalendarDays, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'LEADER', 'EMPLOYEE'] },
    { path: '/reports', label: 'Báo cáo', icon: BarChart3, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'LEADER', 'EMPLOYEE'] },
    { path: '/payroll', label: 'Bảng lương', icon: Wallet, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'EMPLOYEE'] },
    { path: '/admin/users', label: 'Quản lý NV', icon: Users, roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
    { path: '/admin/pending', label: 'Duyệt hồ sơ', icon: ClipboardList, roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
    { path: '/settings', label: 'Cấu hình', icon: Settings, roles: ['SUPER_ADMIN'] },
]

export default function Sidebar() {
    const location = useLocation()
    const { user, hasRole } = useAuth()
    const [collapsed, setCollapsed] = useState(false)

    const visibleItems = menuItems.filter(item => hasRole(item.roles))

    return (
        <>
            {/* Sidebar */}
            <aside className={`bg-white border-r border-slate-200 min-h-screen p-4 fixed left-0 top-0 z-40 transition-all duration-300 shadow-sm ${collapsed ? 'w-20' : 'w-64'}`}>
                {/* Toggle Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-8 w-6 h-6 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center text-xs border border-slate-200 shadow-sm transition-colors z-50 text-slate-600"
                    title={collapsed ? 'Mở rộng' : 'Thu gọn'}
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* Logo */}
                <div className="mb-4 px-2 overflow-hidden">
                    <div className="flex items-center justify-between">
                        <h1 className={`text-2xl font-bold gradient-text transition-all ${collapsed ? 'text-center' : ''}`}>
                            {collapsed ? 'GZ' : 'GoodZWork'}
                        </h1>
                        {!collapsed && <NotificationBell />}
                    </div>
                    {!collapsed && <p className="text-slate-500 text-sm">HR Management System</p>}
                </div>

                {/* User Info */}
                <Link to="/profile" className={`bg-slate-50 border border-slate-200 rounded-xl mb-6 overflow-hidden transition-all hover:border-blue-400 hover:bg-blue-50 block ${collapsed ? 'p-2' : 'p-4'}`}>
                    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                            {user?.avatar ? (
                                <img src={`${API_URL}${user.avatar}`} className="w-full h-full object-cover" />
                            ) : (
                                user?.full_name?.[0] || user?.email?.[0] || '?'
                            )}
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 truncate">{user?.full_name || 'User'}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.role?.replace('_', ' ')}</p>
                            </div>
                        )}
                    </div>
                    {!collapsed && (
                        <div className="mt-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${user?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                user?.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {user?.status}
                            </span>
                        </div>
                    )}
                </Link>

                {/* Navigation */}
                <nav className="space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                    {visibleItems.map(item => {
                        const isActive = location.pathname === item.path ||
                            location.pathname.startsWith(item.path + '/')
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={collapsed ? item.label : ''}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${collapsed ? 'justify-center' : ''
                                    } ${isActive
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                {!collapsed && <span className="font-medium">{item.label}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* Logout */}
                <div className="absolute bottom-4 left-4 right-4">
                    <Link
                        to="/logout"
                        title={collapsed ? 'Đăng xuất' : ''}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all ${collapsed ? 'justify-center' : ''
                            }`}
                    >
                        <LogOut size={20} />
                        {!collapsed && <span className="font-medium">Đăng xuất</span>}
                    </Link>
                </div>
            </aside>

            {/* Spacer for main content */}
            <div className={`transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}></div>
        </>
    )
}
