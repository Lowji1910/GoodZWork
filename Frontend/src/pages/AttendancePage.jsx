import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { attendanceAPI } from '../api'
import WebcamCapture from '../components/WebcamCapture'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function AttendancePage() {
    const { user } = useAuth()
    const [step, setStep] = useState('checking') // checking, denied, camera, success
    const [location, setLocation] = useState(null)
    const [locationError, setLocationError] = useState(null)
    const [distance, setDistance] = useState(null)
    const [todayStatus, setTodayStatus] = useState(null)
    const [loading, setLoading] = useState(false)
    const [attendanceLogs, setAttendanceLogs] = useState([])

    // State cho hiển thị tên người dùng sau khi chấm công
    const [successInfo, setSuccessInfo] = useState(null)
    // State cho thông báo lỗi/feedback trực tiếp trên camera
    const [cameraFeedback, setCameraFeedback] = useState(null)

    useEffect(() => {
        loadTodayStatus()
        loadAttendanceLogs()
        requestLocation()
    }, [])

    const loadTodayStatus = async () => {
        try {
            const response = await attendanceAPI.getTodayStatus()
            setTodayStatus(response.data)
        } catch (error) {
            console.error('Failed to load today status:', error)
        }
    }

    const loadAttendanceLogs = async () => {
        try {
            const response = await attendanceAPI.getLogs()
            setAttendanceLogs(response.data)
        } catch (error) {
            console.error('Failed to load logs:', error)
        }
    }

    const requestLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Trình duyệt không hỗ trợ GPS')
            setStep('denied')
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords
                setLocation({ latitude, longitude, accuracy })

                // Check if within geofence
                try {
                    const response = await attendanceAPI.checkLocation(latitude, longitude)
                    const { allowed, distance: dist, message } = response.data
                    setDistance(dist)

                    if (allowed) {
                        setStep('camera')
                    } else {
                        setStep('denied')
                        setLocationError(message)
                    }
                } catch (error) {
                    setStep('denied')
                    setLocationError('Không thể kiểm tra vị trí')
                }
            },
            (error) => {
                setLocationError('Vui lòng cho phép truy cập vị trí để chấm công')
                setStep('denied')
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const handleCapture = useCallback(async (imageSrc) => {
        if (loading || !location) return

        setLoading(true)
        setCameraFeedback(null) // Reset feedback trước khi xử lý

        try {
            const isCheckOut = todayStatus?.checked_in && !todayStatus?.checked_out

            const data = {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                face_image: imageSrc
            }

            let response
            if (isCheckOut) {
                response = await attendanceAPI.checkOut(data)
            } else {
                response = await attendanceAPI.checkIn(data)
            }

            // Lưu thông tin thành công để hiển thị
            setSuccessInfo({
                userName: response.data.user_name || user?.fullname || user?.email || 'Nhân viên',
                type: isCheckOut ? 'CHECK_OUT' : 'CHECK_IN',
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                message: response.data.message
            })

            toast.success(response.data.message)
            setStep('success')
            loadTodayStatus()
            loadAttendanceLogs()
        } catch (error) {
            const errorMsg = error.response?.data?.detail || 'Chấm công thất bại'
            console.error("Attendance error:", errorMsg);

            // Phân loại lỗi để hiển thị feedback phù hợp
            let feedbackType = 'error';
            if (errorMsg.includes('chưa đăng ký khuôn mặt')) {
                setCameraFeedback({ type: 'warning', message: 'Bạn chưa đăng ký khuôn mặt!' });
            } else if (errorMsg.includes('độ tin cậy')) {
                // Trích xuất % độ tin cậy nếu có
                const match = errorMsg.match(/(\d+\.?\d*)%/);
                const confidence = match ? match[1] + '%' : '';
                setCameraFeedback({ type: 'error', message: `Không khớp! Độ tin cậy: ${confidence}` });
            } else if (errorMsg.includes('Không phát hiện được khuôn mặt')) {
                setCameraFeedback({ type: 'error', message: 'Không tìm thấy khuôn mặt!' });
            } else {
                setCameraFeedback({ type: 'error', message: errorMsg });
            }

            toast.error(errorMsg)

            // Giữ feedback trong 3 giây rồi tự xóa để người dùng thử lại
            setTimeout(() => {
                setCameraFeedback(null)
            }, 3000)

        } finally {
            setLoading(false)
        }
    }, [location, todayStatus, loading, user])

    const isCheckOut = todayStatus?.checked_in && !todayStatus?.checked_out
    const isComplete = todayStatus?.checked_in && todayStatus?.checked_out

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="glass-card p-6">
                <h1 className="text-2xl font-bold mb-2">⏰ Chấm công</h1>
                <p className="text-slate-400">
                    {format(new Date(), "EEEE, 'ngày' dd 'tháng' MM, yyyy", { locale: vi })}
                </p>
            </div>

            {/* Today Status */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4">Trạng thái hôm nay</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl ${todayStatus?.checked_in ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-700/50'}`}>
                        <p className="text-sm text-slate-400">Check-in</p>
                        {todayStatus?.checkin_time ? (
                            <>
                                <p className="text-xl font-bold">{format(new Date(todayStatus.checkin_time), 'HH:mm')}</p>
                                <span className={`text-xs px-2 py-1 rounded-full ${todayStatus.checkin_status === 'ON_TIME' ? 'status-active' : 'status-late'
                                    }`}>
                                    {todayStatus.checkin_status === 'ON_TIME' ? 'Đúng giờ' : 'Đi muộn'}
                                </span>
                            </>
                        ) : (
                            <p className="text-xl font-bold text-slate-500">--:--</p>
                        )}
                    </div>
                    <div className={`p-4 rounded-xl ${todayStatus?.checked_out ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-slate-700/50'}`}>
                        <p className="text-sm text-slate-400">Check-out</p>
                        {todayStatus?.checkout_time ? (
                            <>
                                <p className="text-xl font-bold">{format(new Date(todayStatus.checkout_time), 'HH:mm')}</p>
                                <span className={`text-xs px-2 py-1 rounded-full ${todayStatus.checkout_status === 'ON_TIME' ? 'status-active' : 'status-late'
                                    }`}>
                                    {todayStatus.checkout_status === 'ON_TIME' ? 'Đúng giờ' : 'Về sớm'}
                                </span>
                            </>
                        ) : (
                            <p className="text-xl font-bold text-slate-500">--:--</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Attendance Action */}
            {!isComplete && (
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold mb-4">
                        {isCheckOut ? '🏠 Check-out' : '📍 Check-in'}
                    </h2>

                    {step === 'checking' && (
                        <div className="text-center py-8">
                            <div className="spinner mx-auto mb-4"></div>
                            <p>Đang kiểm tra vị trí...</p>
                        </div>
                    )}

                    {step === 'denied' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">📍</span>
                            </div>
                            <p className="text-red-400 mb-4">{locationError}</p>
                            {distance && (
                                <p className="text-slate-400 mb-4">Khoảng cách: {Math.round(distance)}m</p>
                            )}
                            <button onClick={requestLocation} className="btn-primary">
                                Thử lại
                            </button>
                        </div>
                    )}

                    {step === 'camera' && (
                        <div>
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                                <p className="text-green-400 flex items-center gap-2">
                                    ✓ Bạn đang trong phạm vi cho phép ({Math.round(distance)}m)
                                </p>
                            </div>
                            <p className="text-slate-400 mb-4 text-center">
                                🎯 Đưa khuôn mặt vào vòng tròn xanh và giữ yên để tự động chấm công
                            </p>
                            <WebcamCapture
                                onCapture={handleCapture}
                                autoCapture={false}
                                autoAttendance={true}
                                attendanceDelay={2000}
                                showGuide={true}
                                isProcessing={loading}
                                feedback={cameraFeedback} // Truyền feedback vào webcam
                            />
                        </div>
                    )}

                    {step === 'success' && successInfo && (
                        <div className="text-center py-8">
                            {/* Animation thành công */}
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                {/* Vòng tròn hiệu ứng */}
                                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                                <div className="relative w-full h-full bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                                    <span className="text-4xl">✓</span>
                                </div>
                            </div>

                            {/* Thông tin người dùng */}
                            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-2xl p-6 mb-4">
                                <p className="text-2xl font-bold text-white mb-2">
                                    {successInfo.userName}
                                </p>
                                <p className="text-green-400 text-lg font-medium mb-1">
                                    {successInfo.type === 'CHECK_IN' ? '✅ Check-in thành công!' : '✅ Check-out thành công!'}
                                </p>
                                <p className="text-slate-300 text-lg">
                                    🕐 {successInfo.time}
                                </p>
                            </div>

                            <p className="text-slate-400">
                                {successInfo.type === 'CHECK_IN'
                                    ? 'Chúc bạn một ngày làm việc hiệu quả! 💪'
                                    : 'Hẹn gặp lại bạn ngày mai! 👋'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {isComplete && (
                <div className="glass-card p-6 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🎉</span>
                    </div>
                    <p className="text-lg font-medium mb-2">Bạn đã hoàn tất chấm công hôm nay!</p>
                    <p className="text-slate-400">Hẹn gặp lại ngày mai</p>
                </div>
            )}

            {/* Recent Logs */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4">📋 Lịch sử chấm công</h2>
                <div className="space-y-2">
                    {attendanceLogs.slice(0, 10).map(log => (
                        <div key={log.id} className="flex items-center justify-between py-3 border-b border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full ${log.status === 'ON_TIME' ? 'bg-green-500' :
                                    log.status === 'LATE' ? 'bg-red-500' : 'bg-yellow-500'
                                    }`} />
                                <div>
                                    <p>{log.type === 'CHECK_IN' ? 'Check-in' : 'Check-out'}</p>
                                    <p className="text-xs text-slate-400">
                                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm')}
                                    </p>
                                </div>
                            </div>
                            <span className={`text-sm px-2 py-1 rounded-full ${log.status === 'ON_TIME' ? 'status-active' : 'status-late'
                                }`}>
                                {log.status === 'ON_TIME' ? 'Đúng giờ' :
                                    log.status === 'LATE' ? 'Đi muộn' : 'Về sớm'}
                            </span>
                        </div>
                    ))}
                    {attendanceLogs.length === 0 && (
                        <p className="text-center text-slate-400 py-4">Chưa có lịch sử chấm công</p>
                    )}
                </div>
            </div>
        </div>
    )
}
