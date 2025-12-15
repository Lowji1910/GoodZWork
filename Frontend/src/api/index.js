import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// ============ AUTH APIs ============
export const authAPI = {
    login: (email, password) =>
        api.post('/api/auth/login', { email, password }),

    register: (data) =>
        api.post('/api/auth/register', data),

    getMe: () =>
        api.get('/api/auth/me'),

    initAdmin: () =>
        api.post('/api/auth/init-admin')
}

// ============ USER APIs ============
export const userAPI = {
    getProfile: () =>
        api.get('/api/users/me'),

    updateProfile: (data) =>
        api.put('/api/users/profile', data),

    uploadAvatar: (file) => {
        const formData = new FormData()
        formData.append('file', file)
        return api.post('/api/users/upload-avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
    },

    changePassword: (currentPassword, newPassword) =>
        api.put('/api/users/change-password', {
            current_password: currentPassword,
            new_password: newPassword
        }),

    // Self-enrollment (current user)
    enrollFace: (faceImages) =>
        api.post('/api/users/enroll-face', { face_images: faceImages }),

    // Admin enrollment (for specific user)
    enrollFaceForUser: (userId, faceImages) =>
        api.post(`/api/users/${userId}/enroll-face`, { face_images: faceImages }),

    getPendingUsers: () =>
        api.get('/api/users/pending'),

    approveUser: (userId) =>
        api.put(`/api/users/${userId}/approve`),

    rejectUser: (userId, reason) =>
        api.put(`/api/users/${userId}/reject`, null, { params: { reason } }),

    listUsers: (status, role) =>
        api.get('/api/users/list', { params: { status, role } }),

    getUser: (userId) =>
        api.get(`/api/users/${userId}`),

    searchUsers: (query, department) =>
        api.get('/api/users/search', { params: { q: query, department } }),

    // Employee management
    updateUserStatus: (userId, status) =>
        api.put(`/api/users/${userId}/status`, { status }),

    updateUserRole: (userId, role) =>
        api.put(`/api/users/${userId}/role`, { role }),

    resetUserPassword: (userId) =>
        api.put(`/api/users/${userId}/reset-password`),

    adminUpdateUser: (userId, data) =>
        api.put(`/api/users/${userId}`, data)
}

// ============ ATTENDANCE APIs ============
export const attendanceAPI = {
    checkLocation: (latitude, longitude) =>
        api.post('/api/attendance/check-location', { latitude, longitude }),

    checkIn: (data) =>
        api.post('/api/attendance/checkin', data),

    checkOut: (data) =>
        api.post('/api/attendance/checkout', data),

    getLogs: (startDate, endDate) =>
        api.get('/api/attendance/logs', { params: { start_date: startDate, end_date: endDate } }),

    getTodayStatus: () =>
        api.get('/api/attendance/today'),

    getCompanyLocation: () =>
        api.get('/api/attendance/company-location'),

    getMonthlyReport: (month, year) =>
        api.get('/api/attendance/report/monthly', { params: { month, year } }),

    getTeamReport: (month, year) =>
        api.get('/api/attendance/report/team', { params: { month, year } })
}

// ============ CHAT APIs ============
export const chatAPI = {
    getConversations: () =>
        api.get('/api/chat/conversations'),

    createConversation: (type, name, participants) =>
        api.post('/api/chat/conversations', { type, name, participants }),

    getMessages: (conversationId, limit, before) =>
        api.get(`/api/chat/conversations/${conversationId}/messages`, { params: { limit, before } }),

    uploadFile: (file) => {
        const formData = new FormData()
        formData.append('file', file)
        return api.post('/api/chat/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
    },

    updateConversation: (conversationId, data) =>
        api.put(`/api/chat/conversations/${conversationId}`, data),

    addMembers: (conversationId, memberIds) =>
        api.post(`/api/chat/conversations/${conversationId}/members`, memberIds),

    removeMember: (conversationId, memberId) =>
        api.delete(`/api/chat/conversations/${conversationId}/members/${memberId}`),

    deleteConversation: (conversationId) =>
        api.delete(`/api/chat/conversations/${conversationId}`)
}

// ============ PROJECT APIs ============
export const projectAPI = {
    getProjects: (status) =>
        api.get('/api/projects/', { params: { status } }),

    createProject: (data) =>
        api.post('/api/projects/', data),

    getProject: (projectId) =>
        api.get(`/api/projects/${projectId}`),

    updateProject: (projectId, data) =>
        api.put(`/api/projects/${projectId}`, data),

    updateProjectStatus: (projectId, status) =>
        api.put(`/api/projects/${projectId}/status`, null, { params: { status } }),

    getProjectTasks: (projectId, status, assignedTo) =>
        api.get(`/api/projects/${projectId}/tasks`, { params: { status, assigned_to: assignedTo } }),

    createTask: (projectId, data) =>
        api.post(`/api/projects/${projectId}/tasks`, data),

    getMyTasks: (status) =>
        api.get('/api/projects/tasks/my-tasks', { params: { status } }),

    respondToTask: (taskId, accepted, rejectionReason, rejectionEvidence) =>
        api.put(`/api/projects/tasks/${taskId}/accept`, {
            accepted,
            rejection_reason: rejectionReason,
            rejection_evidence: rejectionEvidence
        }),

    updateTaskProgress: (taskId, progress, notes) =>
        api.put(`/api/projects/tasks/${taskId}/progress`, { progress, notes }),

    getEmployeePerformance: () =>
        api.get('/api/projects/stats/employee-performance'),

    // New endpoints
    getTask: (taskId) =>
        api.get(`/api/projects/tasks/${taskId}`),

    updateTask: (taskId, data) =>
        api.put(`/api/projects/tasks/${taskId}`, data),

    deleteTask: (taskId) =>
        api.delete(`/api/projects/tasks/${taskId}`),

    deleteProject: (projectId) =>
        api.delete(`/api/projects/${projectId}`),

    getProjectMembers: (projectId) =>
        api.get(`/api/projects/${projectId}/members`),

    addProjectMembers: (projectId, memberIds) =>
        api.post(`/api/projects/${projectId}/members`, { member_ids: memberIds }),

    removeProjectMember: (projectId, memberId) =>
        api.delete(`/api/projects/${projectId}/members/${memberId}`)
}

// ============ PAYROLL APIs ============
export const payrollAPI = {
    calculatePayroll: (userId, month, year, baseSalary, bonuses) =>
        api.post('/api/payroll/calculate', {
            user_id: userId,
            month,
            year,
            base_salary: baseSalary,
            bonuses
        }),

    getPayrolls: (month, year, status) =>
        api.get('/api/payroll/list', { params: { month, year, status } }),

    getMyPayroll: () =>
        api.get('/api/payroll/my-payroll'),

    getPayrollDetail: (payrollId) =>
        api.get(`/api/payroll/${payrollId}`),

    approvePayrolls: (payrollIds) =>
        api.put('/api/payroll/approve', { payroll_ids: payrollIds }),

    payPayroll: (payrollId, paymentMethod, notes) =>
        api.put(`/api/payroll/${payrollId}/pay`, {
            payroll_id: payrollId,
            payment_method: paymentMethod,
            notes
        }),

    getPaymentQR: (payrollId, bankAccount) =>
        api.get(`/api/payroll/${payrollId}/qr`, { params: { bank_account: bankAccount } }),

    getPayrollSummary: (month, year) =>
        api.get(`/api/payroll/summary/${month}/${year}`)
}

// ============ LEAVE APIs ============
export const leaveAPI = {
    // Create leave request
    createLeave: (data) =>
        api.post('/api/leaves/', data),

    // Get my leaves
    getMyLeaves: (status, year) =>
        api.get('/api/leaves/my', { params: { status, year } }),

    // Get pending leaves (for approval)
    getPendingLeaves: () =>
        api.get('/api/leaves/pending'),

    // Approve leave
    approveLeave: (leaveId) =>
        api.put(`/api/leaves/${leaveId}/approve`),

    // Reject leave
    rejectLeave: (leaveId, reason) =>
        api.put(`/api/leaves/${leaveId}/reject`, null, { params: { reason } }),

    // Cancel leave
    cancelLeave: (leaveId) =>
        api.put(`/api/leaves/${leaveId}/cancel`),

    // Get calendar
    getLeaveCalendar: (month, year) =>
        api.get('/api/leaves/calendar', { params: { month, year } }),

    // Get stats
    getLeaveStats: (year) =>
        api.get('/api/leaves/stats', { params: { year } })
}

// ============ NOTIFICATION APIs ============
export const notificationAPI = {
    getNotifications: (unreadOnly = false, limit = 20) =>
        api.get('/api/notifications/', { params: { unread_only: unreadOnly, limit } }),

    markAsRead: (notificationId) =>
        api.put(`/api/notifications/${notificationId}/read`),

    markAllAsRead: () =>
        api.put('/api/notifications/read-all'),

    deleteNotification: (notificationId) =>
        api.delete(`/api/notifications/${notificationId}`)
}

// ============ CALENDAR APIs ============
export const calendarAPI = {
    getEvents: (month, year) =>
        api.get('/api/calendar/events', { params: { month, year } })
}

// ============ OVERTIME APIs ============
export const overtimeAPI = {
    createOT: (data) => api.post('/api/overtime/', data),
    getMyOT: (status, month, year) =>
        api.get('/api/overtime/my', { params: { status, month, year } }),
    getPendingOT: () => api.get('/api/overtime/pending'),
    approveOT: (otId) => api.put(`/api/overtime/${otId}/approve`),
    rejectOT: (otId, reason) =>
        api.put(`/api/overtime/${otId}/reject`, null, { params: { reason } }),
    cancelOT: (otId) => api.put(`/api/overtime/${otId}/cancel`),
    getOTStats: (month, year) =>
        api.get('/api/overtime/stats', { params: { month, year } })
}

// ============ EXPORT APIs ============
export const exportAPI = {
    downloadAttendance: async (month, year) => {
        const response = await api.get('/api/export/attendance', {
            params: { month, year },
            responseType: 'blob'
        })
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `attendance_${year}_${month.toString().padStart(2, '0')}.xlsx`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
    },
    downloadLeaves: async (year) => {
        const response = await api.get('/api/export/leaves', {
            params: { year },
            responseType: 'blob'
        })
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `leaves_${year}.xlsx`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
    },
    downloadOvertime: async (month, year) => {
        const response = await api.get('/api/export/overtime', {
            params: { month, year },
            responseType: 'blob'
        })
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `overtime_${year}_${month.toString().padStart(2, '0')}.xlsx`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
    }
}

// ============ KPI APIs ============
export const kpiAPI = {
    createReview: (data) => api.post('/api/kpi/', data),
    getMyReviews: (year, period) =>
        api.get('/api/kpi/my', { params: { year, period } }),
    getTeamReviews: (year) =>
        api.get('/api/kpi/team', { params: { year } }),
    submitReview: (reviewId, data) =>
        api.put(`/api/kpi/${reviewId}/submit`, data),
    managerReview: (reviewId, feedback, approve) =>
        api.put(`/api/kpi/${reviewId}/review`, null, { params: { feedback, approve } }),
    getStats: (year) =>
        api.get('/api/kpi/stats', { params: { year } })
}

// ============ CONTRACTS APIs ============
export const contractsAPI = {
    create: (data) => api.post('/api/contracts/', data),
    getAll: (params) => api.get('/api/contracts/', { params }),
    getMyContracts: () => api.get('/api/contracts/my'),
    getExpiring: (days = 30) => api.get('/api/contracts/expiring', { params: { days } }),
    update: (contractId, data) => api.put(`/api/contracts/${contractId}`, data),
    terminate: (contractId, reason) =>
        api.put(`/api/contracts/${contractId}/terminate`, null, { params: { reason } }),
    getStats: () => api.get('/api/contracts/stats')
}

export default api
