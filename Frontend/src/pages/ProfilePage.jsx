import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { userAPI } from '../api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ProfilePage() {
    const { user, updateUser } = useAuth()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const fileInputRef = useRef(null)

    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        department: '',
        position: '',
        bank_name: '',
        bank_account_number: '',
        bank_account_holder: ''
    })

    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    })

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            const response = await userAPI.getProfile()
            setProfile(response.data)
            setFormData({
                full_name: response.data.full_name || '',
                phone: response.data.phone || '',
                department: response.data.department || '',
                position: response.data.position || '',
                bank_name: response.data.bank_name || '',
                bank_account_number: response.data.bank_account_number || '',
                bank_account_holder: response.data.bank_account_holder || ''
            })
        } catch (error) {
            toast.error('Không thể tải thông tin hồ sơ')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSave = async () => {
        if (!formData.full_name) {
            toast.error('Vui lòng nhập họ và tên')
            return
        }

        setSaving(true)
        try {
            const response = await userAPI.updateProfile(formData)
            toast.success('Cập nhật hồ sơ thành công!')
            updateUser({ ...formData, employee_id: response.data.employee_id })
            setIsEditing(false)
            loadProfile()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Cập nhật thất bại')
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const response = await userAPI.uploadAvatar(file)
            toast.success('Upload avatar thành công!')
            updateUser({ avatar: response.data.avatar_url })
            loadProfile()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Upload thất bại')
        }
    }

    const handleChangePassword = async () => {
        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error('Mật khẩu xác nhận không khớp')
            return
        }
        if (passwordData.new_password.length < 6) {
            toast.error('Mật khẩu mới phải có ít nhất 6 ký tự')
            return
        }

        try {
            await userAPI.changePassword(passwordData.current_password, passwordData.new_password)
            toast.success('Đổi mật khẩu thành công!')
            setShowPasswordModal(false)
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Đổi mật khẩu thất bại')
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
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="glass-card p-6">
                <h1 className="text-2xl font-bold">👤 Hồ sơ cá nhân</h1>
                <p className="text-slate-400">Xem và quản lý thông tin cá nhân của bạn</p>
            </div>

            {/* Profile Card */}
            <div className="glass-card p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div
                            onClick={handleAvatarClick}
                            className="relative w-32 h-32 rounded-full overflow-hidden cursor-pointer group border-4 border-blue-500/30 hover:border-blue-500 transition-all"
                        >
                            {profile?.avatar ? (
                                <img
                                    src={`${API_URL}${profile.avatar}`}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-4xl font-bold text-white">
                                    {profile?.full_name?.[0] || profile?.email?.[0] || '?'}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-sm">📷 Đổi ảnh</span>
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                            accept="image/*"
                            className="hidden"
                        />

                        {/* Employee ID Badge */}
                        {profile?.employee_id && (
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-full">
                                <span className="text-white font-bold">{profile.employee_id}</span>
                            </div>
                        )}

                        {/* Role Badge */}
                        <span className={`text-xs px-3 py-1 rounded-full ${profile?.status === 'ACTIVE' ? 'status-active' :
                                profile?.status === 'PENDING' ? 'status-pending' : 'status-init'
                            }`}>
                            {profile?.role?.replace('_', ' ')} • {profile?.status}
                        </span>
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 space-y-4">
                        {!isEditing ? (
                            /* View Mode */
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoField label="Họ và tên" value={profile?.full_name} icon="👤" />
                                    <InfoField label="Email" value={profile?.email} icon="📧" />
                                    <InfoField label="Số điện thoại" value={profile?.phone} icon="📱" />
                                    <InfoField label="Phòng ban" value={profile?.department} icon="🏢" />
                                    <InfoField label="Chức vụ" value={profile?.position} icon="💼" />
                                </div>

                                {/* Bank Info */}
                                <div className="border-t border-slate-600 pt-4 mt-4">
                                    <h3 className="text-lg font-semibold mb-3">💳 Thông tin ngân hàng</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <InfoField label="Ngân hàng" value={profile?.bank_name} />
                                        <InfoField label="Số tài khoản" value={profile?.bank_account_number} />
                                        <InfoField label="Chủ tài khoản" value={profile?.bank_account_holder} />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-3 pt-4">
                                    <button onClick={() => setIsEditing(true)} className="btn-primary">
                                        ✏️ Chỉnh sửa
                                    </button>
                                    <button onClick={() => setShowPasswordModal(true)} className="btn-secondary">
                                        🔑 Đổi mật khẩu
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* Edit Mode */
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Họ và tên *</label>
                                        <input
                                            type="text"
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Số điện thoại</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Phòng ban</label>
                                        <select
                                            name="department"
                                            value={formData.department}
                                            onChange={handleChange}
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3"
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
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3"
                                        />
                                    </div>
                                </div>

                                {/* Bank Info Edit */}
                                <div className="border-t border-slate-600 pt-4 mt-4">
                                    <h3 className="text-lg font-semibold mb-3">💳 Thông tin ngân hàng</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Ngân hàng</label>
                                            <select
                                                name="bank_name"
                                                value={formData.bank_name}
                                                onChange={handleChange}
                                                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3"
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
                                            <label className="block text-sm font-medium mb-2">Số tài khoản</label>
                                            <input
                                                type="text"
                                                name="bank_account_number"
                                                value={formData.bank_account_number}
                                                onChange={handleChange}
                                                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Chủ tài khoản</label>
                                            <input
                                                type="text"
                                                name="bank_account_holder"
                                                value={formData.bank_account_holder}
                                                onChange={handleChange}
                                                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Save/Cancel Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button onClick={handleSave} disabled={saving} className="btn-primary">
                                        {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="btn-secondary">
                                        ❌ Hủy
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">🔑 Đổi mật khẩu</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Mật khẩu hiện tại</label>
                                <input
                                    type="password"
                                    value={passwordData.current_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Mật khẩu mới</label>
                                <input
                                    type="password"
                                    value={passwordData.new_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Xác nhận mật khẩu</label>
                                <input
                                    type="password"
                                    value={passwordData.confirm_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleChangePassword} className="btn-primary flex-1">
                                Xác nhận
                            </button>
                            <button onClick={() => setShowPasswordModal(false)} className="btn-secondary flex-1">
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Helper component for displaying info fields
function InfoField({ label, value, icon }) {
    return (
        <div className="bg-slate-700/30 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">{icon} {label}</p>
            <p className="font-medium">{value || '—'}</p>
        </div>
    )
}
