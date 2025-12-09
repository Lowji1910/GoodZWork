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
    updateProfile: (data) =>
        api.put('/api/users/profile', data),

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
        api.get(`/api/users/${userId}`)
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
        api.get('/api/attendance/company-location')
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
        api.get('/api/projects/stats/employee-performance')
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

export default api
