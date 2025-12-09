import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem('token'))
    const [loading, setLoading] = useState(true)

    // Load user on mount
    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                try {
                    const response = await authAPI.getMe()
                    setUser(response.data)
                } catch (error) {
                    console.error('Failed to load user:', error)
                    logout()
                }
            }
            setLoading(false)
        }
        loadUser()
    }, [token])

    const login = async (email, password) => {
        const response = await authAPI.login(email, password)
        const { access_token, user: userData } = response.data

        localStorage.setItem('token', access_token)
        localStorage.setItem('user', JSON.stringify(userData))

        setToken(access_token)
        setUser(userData)

        return userData
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
    }

    const updateUser = (userData) => {
        setUser(prev => ({ ...prev, ...userData }))
        localStorage.setItem('user', JSON.stringify({ ...user, ...userData }))
    }

    const isAuthenticated = !!token && !!user

    const hasRole = (roles) => {
        if (!user) return false
        if (typeof roles === 'string') return user.role === roles
        return roles.includes(user.role)
    }

    const isActive = user?.status === 'ACTIVE'
    const needsProfileSetup = user?.status === 'INIT'
    const isPending = user?.status === 'PENDING'

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            isAuthenticated,
            isActive,
            needsProfileSetup,
            isPending,
            login,
            logout,
            updateUser,
            hasRole
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
