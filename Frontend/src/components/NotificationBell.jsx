import { useState, useEffect, useRef } from 'react'
import { notificationAPI } from '../api'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
    Bell,
    Palmtree,
    CheckCircle,
    XCircle,
    ClipboardList,
    Check,
    FolderPlus,
    Wallet,
    Clock,
    Info,
    MailOpen
} from 'lucide-react'

const NOTIFICATION_ICONS = {
    LEAVE_REQUEST: Palmtree,
    LEAVE_APPROVED: CheckCircle,
    LEAVE_REJECTED: XCircle,
    TASK_ASSIGNED: ClipboardList,
    TASK_COMPLETED: Check,
    PROJECT_ADDED: FolderPlus,
    PAYROLL_READY: Wallet,
    ATTENDANCE_REMINDER: Clock,
    SYSTEM: Info
}

const NOTIFICATION_COLORS = {
    LEAVE_REQUEST: 'text-blue-500',
    LEAVE_APPROVED: 'text-green-500',
    LEAVE_REJECTED: 'text-red-500',
    TASK_ASSIGNED: 'text-purple-500',
    TASK_COMPLETED: 'text-green-500',
    PROJECT_ADDED: 'text-blue-500',
    PAYROLL_READY: 'text-orange-500',
    ATTENDANCE_REMINDER: 'text-yellow-500',
    SYSTEM: 'text-slate-500'
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        loadNotifications()
        const interval = setInterval(loadNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const loadNotifications = async () => {
        try {
            const res = await notificationAPI.getNotifications(false, 10)
            setNotifications(res.data.notifications)
            setUnreadCount(res.data.unread_count)
        } catch (error) {
            console.error('Failed to load notifications:', error)
        }
    }

    const handleMarkAsRead = async (notificationId) => {
        try {
            await notificationAPI.markAsRead(notificationId)
            setNotifications(prev => prev.map(n =>
                n.id === notificationId ? { ...n, read: true } : n
            ))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            console.error('Failed to mark as read:', error)
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            await notificationAPI.markAllAsRead()
            setNotifications(prev => prev.map(n => ({ ...n, read: true })))
            setUnreadCount(0)
        } catch (error) {
            console.error('Failed to mark all as read:', error)
        }
    }

    const handleToggle = () => {
        setIsOpen(!isOpen)
        if (!isOpen) {
            loadNotifications()
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={handleToggle}
                className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
                title="Thông báo"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-semibold text-slate-800">Thông báo</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                Đánh dấu tất cả đã đọc
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-slate-400">
                                <MailOpen size={32} className="mx-auto mb-2 text-slate-300" />
                                <p className="text-sm">Không có thông báo</p>
                            </div>
                        ) : (
                            notifications.map(notification => {
                                const Icon = NOTIFICATION_ICONS[notification.type] || Bell
                                const color = NOTIFICATION_COLORS[notification.type] || 'text-slate-500'
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                                        className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Icon size={20} className={color} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!notification.read ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: vi })}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-center">
                            <a href="/notifications" className="text-xs text-blue-600 hover:underline">
                                Xem tất cả thông báo
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
