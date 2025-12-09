import { useState, useEffect, useCallback } from 'react'
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

            toast.success(response.data.message)
            setStep('success')
            loadTodayStatus()
            loadAttendanceLogs()
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Chấm công thất bại')
        } finally {
            setLoading(false)
        }
    }, [location, todayStatus, loading])

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
                            <p className="text-slate-400 mb-4">Đưa khuôn mặt vào khung hình và chụp ảnh</p>
                            <WebcamCapture
                                onCapture={handleCapture}
                                autoCapture={false}
                                showGuide={true}
                            />
                            {loading && (
                                <div className="mt-4 text-center">
                                    <div className="spinner mx-auto mb-2"></div>
                                    <p>Đang xác thực khuôn mặt...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">✓</span>
                            </div>
                            <p className="text-green-400 text-lg font-medium mb-2">
                                {isCheckOut ? 'Check-out thành công!' : 'Check-in thành công!'}
                            </p>
                            <p className="text-slate-400">Chúc bạn một ngày làm việc hiệu quả!</p>
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
