import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { userAPI } from '../api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ProfileSetupPage() {
    const navigate = useNavigate()
    const { user, updateUser } = useAuth()
    const [loading, setLoading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar || null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)

    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        department: user?.department || '',
        position: user?.position || '',
        bank_name: user?.bank_name || '',
        bank_account_number: user?.bank_account_number || '',
        bank_account_holder: user?.bank_account_holder || ''
    })

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const response = await userAPI.uploadAvatar(file)
            setAvatarUrl(response.data.avatar_url)
            updateUser({ avatar: response.data.avatar_url })
            toast.success('Upload ảnh đại diện thành công!')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Upload thất bại')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validate required fields
        if (!avatarUrl) {
            toast.error('Vui lòng upload ảnh đại diện')
            return
        }
        if (!formData.full_name) {
            toast.error('Vui lòng nhập họ và tên')
            return
        }
        if (!formData.phone) {
            toast.error('Vui lòng nhập số điện thoại')
            return
        }
        if (!formData.department) {
            toast.error('Vui lòng chọn phòng ban')
            return
        }
        if (!formData.position) {
            toast.error('Vui lòng nhập chức vụ')
            return
        }
        if (!formData.bank_name) {
            toast.error('Vui lòng chọn ngân hàng')
            return
        }
        if (!formData.bank_account_number) {
            toast.error('Vui lòng nhập số tài khoản')
            return
        }
        if (!formData.bank_account_holder) {
            toast.error('Vui lòng nhập tên chủ tài khoản')
            return
        }

        setLoading(true)
        try {
            const response = await userAPI.updateProfile({
                ...formData,
                avatar: avatarUrl
            })
            updateUser({ ...formData, avatar: avatarUrl, employee_id: response.data.employee_id })
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
            <div className="glass-card p-8 w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold">Hoàn tất hồ sơ</h1>
                    <p className="text-slate-400 mt-2">
                        Bước 1/2: Điền đầy đủ thông tin cá nhân
                    </p>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-8">
                    <div className="flex-1 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                    <div className="flex-1 h-2 bg-slate-700 rounded-full" />
                </div>

                {/* Avatar Upload */}
                <div className="flex flex-col items-center mb-8">
                    <div
                        onClick={handleAvatarClick}
                        className={`relative w-28 h-28 rounded-full overflow-hidden cursor-pointer group border-4 ${avatarUrl ? 'border-green-500' : 'border-red-500/50'} hover:border-blue-500 transition-all`}
                    >
                        {avatarUrl ? (
                            <img
                                src={`${API_URL}${avatarUrl}`}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-slate-700 flex items-center justify-center text-4xl">
                                📷
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-sm">{uploading ? '⏳' : '📷'}</span>
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        accept="image/*"
                        className="hidden"
                    />
                    <p className="text-sm text-slate-400 mt-2">
                        {avatarUrl ? '✅ Đã có ảnh đại diện' : '⚠️ Bắt buộc upload ảnh đại diện'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Personal Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <label className="block text-sm font-medium mb-2">
                                Số điện thoại <span className="text-red-400">*</span>
                            </label>
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
                            <label className="block text-sm font-medium mb-2">
                                Phòng ban <span className="text-red-400">*</span>
                            </label>
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
                            <label className="block text-sm font-medium mb-2">
                                Chức vụ <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                name="position"
                                value={formData.position}
                                onChange={handleChange}
                                placeholder="VD: Nhân viên, Trưởng phòng..."
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Bank Info */}
                    <div className="border-t border-slate-600 pt-5">
                        <h3 className="text-lg font-semibold mb-4">💳 Thông tin ngân hàng</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Ngân hàng <span className="text-red-400">*</span>
                                </label>
                                <select
                                    name="bank_name"
                                    value={formData.bank_name}
                                    onChange={handleChange}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Chọn ngân hàng</option>
                                    <option value="Vietcombank">Vietcombank</option>
                                    <option value="Techcombank">Techcombank</option>
                                    <option value="MB Bank">MB Bank</option>
                                    <option value="BIDV">BIDV</option>
                                    <option value="Vietinbank">Vietinbank</option>
                                    <option value="ACB">ACB</option>
                                    <option value="TPBank">TPBank</option>
                                    <option value="VPBank">VPBank</option>
                                    <option value="Sacombank">Sacombank</option>
                                    <option value="Agribank">Agribank</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Số tài khoản <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="bank_account_number"
                                    value={formData.bank_account_number}
                                    onChange={handleChange}
                                    placeholder="1234567890"
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Tên chủ TK <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="bank_account_holder"
                                    value={formData.bank_account_holder}
                                    onChange={handleChange}
                                    placeholder="NGUYEN VAN A"
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary mt-6"
                    >
                        {loading ? 'Đang lưu...' : 'Tiếp tục đăng ký khuôn mặt →'}
                    </button>
                </form>
            </div>
        </div>
    )
}
