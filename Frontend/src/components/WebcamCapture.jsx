import { useRef, useCallback, useState, useEffect } from 'react'
import Webcam from 'react-webcam'

export default function WebcamCapture({
    onCapture,
    onError,
    autoCapture = false,
    captureInterval = 33,   // 33ms = ~30 ảnh/giây
    maxCaptures = 150,      // 150 ảnh tổng
    showGuide = true
}) {
    const webcamRef = useRef(null)
    const [isCapturing, setIsCapturing] = useState(false)
    const [captureCount, setCaptureCount] = useState(0)
    const [currentPhase, setCurrentPhase] = useState(0)
    const [error, setError] = useState(null)

    const phases = [
        { label: 'Nhìn thẳng', icon: '😐', count: 30 },   // 1 giây
        { label: 'Quay trái', icon: '👈', count: 30 },    // 1 giây
        { label: 'Quay phải', icon: '👉', count: 30 },   // 1 giây
        { label: 'Ngước lên', icon: '👆', count: 30 },   // 1 giây
        { label: 'Cúi xuống', icon: '👇', count: 30 },   // 1 giây
    ]  // Tổng: 5 giây cho 150 ảnh

    const videoConstraints = {
        width: 640,
        height: 480,
        facingMode: 'user'
    }

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot()
            if (imageSrc) {
                onCapture(imageSrc)
                return true
            }
        }
        return false
    }, [onCapture])

    // Auto capture for face enrollment
    useEffect(() => {
        let intervalId

        if (autoCapture && isCapturing && captureCount < maxCaptures) {
            intervalId = setInterval(() => {
                const success = capture()
                if (success) {
                    setCaptureCount(prev => {
                        const newCount = prev + 1

                        // Update phase
                        let total = 0
                        for (let i = 0; i < phases.length; i++) {
                            total += phases[i].count
                            if (newCount <= total) {
                                setCurrentPhase(i)
                                break
                            }
                        }

                        // Stop when max reached
                        if (newCount >= maxCaptures) {
                            setIsCapturing(false)
                        }

                        return newCount
                    })
                }
            }, captureInterval)
        }

        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [autoCapture, isCapturing, captureCount, maxCaptures, captureInterval, capture])

    const handleUserMediaError = (error) => {
        console.error('Webcam error:', error)
        setError('Không thể truy cập camera. Vui lòng cho phép quyền truy cập camera.')
        if (onError) onError(error)
    }

    const startCapture = () => {
        setCaptureCount(0)
        setCurrentPhase(0)
        setIsCapturing(true)
    }

    const stopCapture = () => {
        setIsCapturing(false)
    }

    const progress = (captureCount / maxCaptures) * 100

    return (
        <div className="relative">
            {error ? (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center">
                    <p className="text-red-400">{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="mt-4 btn-secondary"
                    >
                        Thử lại
                    </button>
                </div>
            ) : (
                <>
                    {/* Camera View */}
                    <div className="camera-overlay rounded-xl overflow-hidden">
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={videoConstraints}
                            onUserMediaError={handleUserMediaError}
                            className="w-full"
                        />

                        {/* Face Guide Overlay */}
                        {showGuide && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-48 h-64 border-4 border-dashed border-blue-400/50 rounded-full" />
                            </div>
                        )}
                    </div>

                    {/* Auto Capture Controls */}
                    {autoCapture && (
                        <div className="mt-4">
                            {/* Progress Bar */}
                            <div className="bg-slate-700 rounded-full h-3 mb-4 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            {/* Phase Guide */}
                            {isCapturing && (
                                <div className="text-center mb-4">
                                    <p className="text-4xl mb-2">{phases[currentPhase]?.icon}</p>
                                    <p className="text-lg font-medium">{phases[currentPhase]?.label}</p>
                                    <p className="text-slate-400 text-sm">
                                        Ảnh: {captureCount} / {maxCaptures}
                                    </p>
                                </div>
                            )}

                            {/* Control Buttons */}
                            <div className="flex gap-4 justify-center">
                                {!isCapturing ? (
                                    <button
                                        onClick={startCapture}
                                        className="btn-primary"
                                        disabled={captureCount >= maxCaptures}
                                    >
                                        {captureCount > 0 ? 'Tiếp tục chụp' : 'Bắt đầu chụp'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopCapture}
                                        className="btn-danger"
                                    >
                                        Dừng lại
                                    </button>
                                )}
                            </div>

                            {/* Completion Message */}
                            {captureCount >= maxCaptures && (
                                <div className="mt-4 bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
                                    <p className="text-green-400 font-medium">
                                        ✅ Đã chụp đủ {maxCaptures} ảnh!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual Capture Button */}
                    {!autoCapture && (
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={capture}
                                className="btn-primary"
                            >
                                📸 Chụp ảnh
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
