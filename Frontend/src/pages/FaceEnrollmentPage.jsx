import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { userAPI } from '../api'
import WebcamCapture from '../components/WebcamCapture'

export default function FaceEnrollmentPage() {
    const navigate = useNavigate()
    const { updateUser } = useAuth()
    const [capturedImages, setCapturedImages] = useState([])
    const [submitting, setSubmitting] = useState(false)

    const handleCapture = useCallback((imageSrc) => {
        setCapturedImages(prev => [...prev, imageSrc])
    }, [])

    const handleSubmit = async () => {
        if (capturedImages.length < 10) {
            toast.error(`Cần ít nhất 10 ảnh, bạn mới chụp ${capturedImages.length} ảnh`)
            return
        }

        setSubmitting(true)
        try {
            const response = await userAPI.enrollFace(capturedImages)
            toast.success(response.data.message)
            updateUser({
                status: 'PENDING',
                face_registered: true
            })
            navigate('/pending')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Đăng ký khuôn mặt thất bại')
        } finally {
            setSubmitting(false)
        }
    }

    const handleReset = () => {
        setCapturedImages([])
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card p-8 w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🤖</span>
                    </div>
                    <h1 className="text-2xl font-bold">Đăng ký khuôn mặt</h1>
                    <p className="text-slate-400 mt-2">
                        Bước 2/2: Chụp ảnh khuôn mặt để AI nhận diện
                    </p>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-8">
                    <div className="flex-1 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                    <div className="flex-1 h-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-full" />
                </div>

                {/* Instructions */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                    <h3 className="font-medium text-blue-400 mb-2">📋 Hướng dẫn</h3>
                    <ul className="text-sm text-slate-300 space-y-1">
                        <li>• Giữ khuôn mặt trong khung hình</li>
                        <li>• Quay mặt theo hướng dẫn: Thẳng → Trái → Phải → Lên → Xuống</li>
                        <li>• Đảm bảo ánh sáng đủ tốt</li>
                        <li>• Hệ thống sẽ tự động chụp 150 ảnh</li>
                    </ul>
                </div>

                {/* Webcam */}
                <WebcamCapture
                    onCapture={handleCapture}
                    autoCapture={true}
                    captureInterval={33}
                    maxCaptures={150}
                    showGuide={true}
                />

                {/* Status */}
                <div className="mt-6 text-center">
                    <p className="text-lg">
                        Đã chụp: <span className="font-bold text-blue-400">{capturedImages.length}</span> / 150 ảnh
                    </p>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-4">
                    <button
                        onClick={handleReset}
                        className="flex-1 btn-secondary"
                        disabled={submitting}
                    >
                        🔄 Chụp lại
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={capturedImages.length < 50 || submitting}
                        className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Đang xử lý...
                            </span>
                        ) : (
                            '✓ Gửi đăng ký'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
