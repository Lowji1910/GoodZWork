import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { userAPI } from '../api'

export default function ProfileSetupPage() {
    const navigate = useNavigate()
    const { user, updateUser } = useAuth()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        department: user?.department || '',
        position: user?.position || ''
    })

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.full_name) {
            toast.error('Vui lòng nhập họ và tên')
            return
        }

        setLoading(true)
        try {
            await userAPI.updateProfile(formData)
            updateUser(formData)
            toast.success('Cập nhật hồ sơ thành công!')
            navigate('/face-enrollment')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Cập nhật thất bại')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card p-8 w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">👤</span>
                    </div>
                    <h1 className="text-2xl font-bold">Cập nhật hồ sơ</h1>
                    <p className="text-slate-400 mt-2">
                        Bước 1/2: Điền thông tin cá nhân
                    </p>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-8">
                    <div className="flex-1 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                    <div className="flex-1 h-2 bg-slate-700 rounded-full" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Họ và tên <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            placeholder="Nguyễn Văn A"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Số điện thoại</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="0901234567"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Phòng ban</label>
                        <select
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Chọn phòng ban</option>
                            <option value="IT">Công nghệ thông tin</option>
                            <option value="HR">Nhân sự</option>
                            <option value="Finance">Tài chính</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Sales">Kinh doanh</option>
                            <option value="Operations">Vận hành</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Chức vụ</label>
                        <input
                            type="text"
                            name="position"
                            value={formData.position}
                            onChange={handleChange}
                            placeholder="VD: Nhân viên, Trưởng phòng..."
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary mt-6"
                    >
                        {loading ? 'Đang lưu...' : 'Tiếp tục →'}
                    </button>
                </form>
            </div>
        </div>
    )
}
