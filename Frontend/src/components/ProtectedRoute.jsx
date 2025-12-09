import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles = [] }) {
    const { isAuthenticated, loading, user, needsProfileSetup, isPending } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    // Redirect INIT users to profile setup
    if (needsProfileSetup) {
        return <Navigate to="/setup-profile" replace />
    }

    // Redirect PENDING users to waiting page
    if (isPending) {
        return <Navigate to="/pending" replace />
    }

    // Check role access
    if (roles.length > 0 && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />
    }

    return children
}
