import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!email || !password) {
            toast.error('Vui lòng nhập đầy đủ thông tin')
            return
        }

        setLoading(true)
        try {
            const user = await login(email, password)
            toast.success(`Chào mừng ${user.full_name || user.email}!`)

            // Redirect based on user status
            if (user.status === 'INIT') {
                navigate('/setup-profile')
            } else if (user.status === 'PENDING') {
                navigate('/pending')
            } else {
                navigate('/dashboard')
            }
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Đăng nhập thất bại')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card p-8 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold gradient-text mb-2">GoodZWork</h1>
                    <p className="text-slate-400">Hệ thống quản lý nhân sự thông minh</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@company.com"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Đang đăng nhập...
                            </span>
                        ) : (
                            'Đăng nhập'
                        )}
                    </button>
                </form>

                {/* Features */}
                <div className="mt-8 pt-8 border-t border-slate-700">
                    <p className="text-center text-slate-400 text-sm mb-4">Tính năng nổi bật</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <span className="text-2xl">🤖</span>
                            <p className="text-xs text-slate-400 mt-1">AI Nhận diện</p>
                        </div>
                        <div>
                            <span className="text-2xl">📍</span>
                            <p className="text-xs text-slate-400 mt-1">GPS Check-in</p>
                        </div>
                        <div>
                            <span className="text-2xl">💬</span>
                            <p className="text-xs text-slate-400 mt-1">Chat Realtime</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
