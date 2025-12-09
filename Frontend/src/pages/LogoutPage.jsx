import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LogoutPage() {
    const { logout } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        logout()
        navigate('/login', { replace: true })
    }, [logout, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="spinner"></div>
        </div>
    )
}
