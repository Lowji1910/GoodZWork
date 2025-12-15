import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Components
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import LoginPage from './pages/LoginPage'
import LogoutPage from './pages/LogoutPage'
import ProfileSetupPage from './pages/ProfileSetupPage'
import FaceEnrollmentPage from './pages/FaceEnrollmentPage'
import PendingPage from './pages/PendingPage'
import DashboardPage from './pages/DashboardPage'
import AttendancePage from './pages/AttendancePage'
import ChatPage from './pages/ChatPage'
import ProjectsPage from './pages/ProjectsPage'
import TasksPage from './pages/TasksPage'
import PayrollPage from './pages/PayrollPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminPendingPage from './pages/AdminPendingPage'
import AdminFaceEnrollPage from './pages/AdminFaceEnrollPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import LeavesPage from './pages/LeavesPage'
import ReportsPage from './pages/ReportsPage'
import CalendarPage from './pages/CalendarPage'
import OvertimePage from './pages/OvertimePage'
import KPIPage from './pages/KPIPage'
import ContractsPage from './pages/ContractsPage'

// Layout with Sidebar
function MainLayout({ children }) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-6 transition-all duration-300">
                {children}
            </main>
        </div>
    )
}


export default function App() {
    const { loading, isAuthenticated, needsProfileSetup, isPending } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
            />
            <Route path="/logout" element={<LogoutPage />} />

            {/* Onboarding Routes */}
            <Route
                path="/setup-profile"
                element={
                    isAuthenticated && needsProfileSetup
                        ? <ProfileSetupPage />
                        : <Navigate to="/dashboard" />
                }
            />
            <Route
                path="/face-enrollment"
                element={
                    isAuthenticated && needsProfileSetup
                        ? <FaceEnrollmentPage />
                        : <Navigate to="/dashboard" />
                }
            />
            <Route
                path="/pending"
                element={
                    isAuthenticated && isPending
                        ? <PendingPage />
                        : <Navigate to="/dashboard" />
                }
            />

            {/* Protected Routes with Sidebar Layout */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <MainLayout><DashboardPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/attendance"
                element={
                    <ProtectedRoute>
                        <MainLayout><AttendancePage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/chat"
                element={
                    <ProtectedRoute>
                        <MainLayout><ChatPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/projects"
                element={
                    <ProtectedRoute>
                        <MainLayout><ProjectsPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/projects/:projectId"
                element={
                    <ProtectedRoute>
                        <MainLayout><ProjectDetailPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/tasks"
                element={
                    <ProtectedRoute>
                        <MainLayout><TasksPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/leaves"
                element={
                    <ProtectedRoute>
                        <MainLayout><LeavesPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/reports"
                element={
                    <ProtectedRoute>
                        <MainLayout><ReportsPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/calendar"
                element={
                    <ProtectedRoute>
                        <MainLayout><CalendarPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/overtime"
                element={
                    <ProtectedRoute>
                        <MainLayout><OvertimePage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/kpi"
                element={
                    <ProtectedRoute>
                        <MainLayout><KPIPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/contracts"
                element={
                    <ProtectedRoute>
                        <MainLayout><ContractsPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/payroll"
                element={
                    <ProtectedRoute>
                        <MainLayout><PayrollPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <MainLayout><ProfilePage /></MainLayout>
                    </ProtectedRoute>
                }
            />

            {/* Admin Routes */}
            <Route
                path="/admin/users"
                element={
                    <ProtectedRoute roles={['SUPER_ADMIN', 'HR_MANAGER']}>
                        <MainLayout><AdminUsersPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/pending"
                element={
                    <ProtectedRoute roles={['SUPER_ADMIN', 'HR_MANAGER']}>
                        <MainLayout><AdminPendingPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/face-enroll/:userId"
                element={
                    <ProtectedRoute roles={['SUPER_ADMIN', 'HR_MANAGER']}>
                        <MainLayout><AdminFaceEnrollPage /></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <ProtectedRoute roles={['SUPER_ADMIN']}>
                        <MainLayout><SettingsPage /></MainLayout>
                    </ProtectedRoute>
                }
            />

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}
