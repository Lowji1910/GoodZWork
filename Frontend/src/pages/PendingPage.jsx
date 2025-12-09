import { useAuth } from '../context/AuthContext'

export default function PendingPage() {
    const { user, logout } = useAuth()

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card p-8 w-full max-w-md text-center">
                {/* Icon */}
                <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-5xl">⏳</span>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold mb-2">Chờ duyệt hồ sơ</h1>
                <p className="text-slate-400 mb-6">
                    Hồ sơ của bạn đang được HR xem xét
                </p>

                {/* Status Card */}
                <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-400">Họ tên</span>
                        <span className="font-medium">{user?.full_name || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-400">Email</span>
                        <span className="font-medium">{user?.email}</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-400">Phòng ban</span>
                        <span className="font-medium">{user?.department || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Trạng thái</span>
                        <span className="status-pending px-3 py-1 rounded-full text-sm">
                            PENDING
                        </span>
                    </div>
                </div>

                {/* Info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 text-left">
                    <p className="text-sm text-slate-300">
                        💡 <strong>Lưu ý:</strong> Bạn sẽ nhận được thông báo khi hồ sơ được duyệt.
                        Trong thời gian chờ, bạn chỉ có thể xem các thông báo công khai.
                    </p>
                </div>

                {/* Action */}
                <div className="flex gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex-1 btn-secondary"
                    >
                        🔄 Kiểm tra lại
                    </button>
                    <button
                        onClick={logout}
                        className="flex-1 btn-danger"
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    )
}
