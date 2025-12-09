import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'LEADER', 'EMPLOYEE'] },
    { path: '/attendance', label: 'Chấm công', icon: '⏰', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'LEADER', 'EMPLOYEE'] },
    { path: '/chat', label: 'Chat', icon: '💬', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'LEADER', 'EMPLOYEE'] },
    { path: '/projects', label: 'Dự án', icon: '📁', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'LEADER', 'EMPLOYEE'] },
    { path: '/tasks', label: 'Công việc', icon: '✅', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'LEADER', 'EMPLOYEE'] },
    { path: '/payroll', label: 'Bảng lương', icon: '💰', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'EMPLOYEE'] },
    { path: '/admin/users', label: 'Quản lý NV', icon: '👥', roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
    { path: '/admin/pending', label: 'Duyệt hồ sơ', icon: '📋', roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
    { path: '/settings', label: 'Cấu hình', icon: '⚙️', roles: ['SUPER_ADMIN'] },
]

export default function Sidebar() {
    const location = useLocation()
    const { user, hasRole } = useAuth()
    const [collapsed, setCollapsed] = useState(false)

    const visibleItems = menuItems.filter(item => hasRole(item.roles))

    return (
        <>
            {/* Sidebar */}
            <aside className={`glass min-h-screen p-4 fixed left-0 top-0 z-40 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'
                }`}>
                {/* Toggle Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-8 w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-xs border border-slate-600 transition-colors z-50"
                    title={collapsed ? 'Mở rộng' : 'Thu gọn'}
                >
                    {collapsed ? '→' : '←'}
                </button>

                {/* Logo */}
                <div className="mb-8 px-2 overflow-hidden">
                    <h1 className={`text-2xl font-bold gradient-text transition-all ${collapsed ? 'text-center' : ''}`}>
                        {collapsed ? 'GZ' : 'GoodZWork'}
                    </h1>
                    {!collapsed && <p className="text-slate-400 text-sm">HR Management System</p>}
                </div>

                {/* User Info */}
                <div className={`glass-card mb-6 overflow-hidden transition-all ${collapsed ? 'p-2' : 'p-4'}`}>
                    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {user?.full_name?.[0] || user?.email?.[0] || '?'}
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{user?.full_name || 'User'}</p>
                                <p className="text-xs text-slate-400 truncate">{user?.role?.replace('_', ' ')}</p>
                            </div>
                        )}
                    </div>
                    {!collapsed && (
                        <div className="mt-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${user?.status === 'ACTIVE' ? 'status-active' :
                                user?.status === 'PENDING' ? 'status-pending' : 'status-init'
                                }`}>
                                {user?.status}
                            </span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                    {visibleItems.map(item => {
                        const isActive = location.pathname === item.path ||
                            location.pathname.startsWith(item.path + '/')
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={collapsed ? item.label : ''}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${collapsed ? 'justify-center' : ''
                                    } ${isActive
                                        ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-white border border-blue-500/30'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
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
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all ${collapsed ? 'justify-center' : ''
                            }`}
                    >
                        <span className="text-xl">🚪</span>
                        {!collapsed && <span className="font-medium">Đăng xuất</span>}
                    </Link>
                </div>
            </aside>

            {/* Spacer for main content */}
            <div className={`transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}></div>
        </>
    )
}
