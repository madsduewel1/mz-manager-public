import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
    changePassword: (data) => api.put('/auth/change-password', data),
    onboardingComplete: () => api.post('/auth/onboarding-complete'),
    updateTheme: (theme) => api.post('/auth/update-theme', { theme }),
    updatePreferences: (prefs) => api.post('/auth/update-preferences', prefs),
    me: () => api.get('/auth/me')
};

// Assets API
export const assetsAPI = {
    getAll: (params) => api.get('/assets', { params }),
    getOne: (id) => api.get(`/assets/${id}`),
    create: (data) => api.post('/assets', data),
    update: (id, data) => api.put(`/assets/${id}`, data),
    delete: (id) => api.delete(`/assets/${id}`),
    getHistory: (id) => api.get(`/assets/${id}/history`),
    getQR: (id) => api.get(`/assets/${id}/qr`),
    lookupByQR: (qrCode) => api.get(`/assets/lookup/qr/${qrCode}`)
};

// Containers API
export const containersAPI = {
    getAll: () => api.get('/containers'),
    getOne: (id) => api.get(`/containers/${id}`),
    create: (data) => api.post('/containers', data),
    update: (id, data) => api.put(`/containers/${id}`, data),
    delete: (id) => api.delete(`/containers/${id}`),
    getQR: (id) => api.get(`/containers/${id}/qr`)
};

// Lendings API
export const lendingsAPI = {
    getAll: () => api.get('/lendings'),
    getActive: () => api.get('/lendings/active'),
    create: (data) => api.post('/lendings', data),
    return: (id) => api.put(`/lendings/${id}/return`),
    delete: (id) => api.delete(`/lendings/${id}`)
};

// Errors API
export const errorsAPI = {
    getAll: (params) => api.get('/errors', { params }),
    getPublicInfo: (qrCode) => axios.get(`/api/errors/public/${qrCode}`),
    getPublicRooms: () => axios.get('/api/errors/public/rooms'),
    getPublicContainersInRoom: (roomId) => axios.get(`/api/errors/public/containers/room/${roomId}`),
    getPublicAssetsInRoom: (roomId) => axios.get(`/api/errors/public/assets/room/${roomId}`),
    getPublicAssetsInContainer: (containerId) => axios.get(`/api/errors/public/assets/container/${containerId}`),
    submitPublic: (formData) => axios.post('/api/errors/public', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    update: (id, data) => api.put(`/errors/${id}`, data),
    getEligibleUsers: () => api.get('/errors/eligible-users'),
    getFeed: (id) => api.get(`/errors/${id}/feed`),
    addComment: (id, comment) => api.post(`/errors/${id}/comments`, { comment }),
    delete: (id) => api.delete(`/errors/${id}`)
};

// Dashboard API
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats')
};

// Admin API
export const adminAPI = {
    getRoles: () => api.get('/admin/roles'),
    createRole: (data) => api.post('/admin/roles', data),
    updateRole: (id, data) => api.put(`/admin/roles/${id}`, data),
    deleteRole: (id) => api.delete(`/admin/roles/${id}`),
    getUsers: () => api.get('/users'),
    createUser: (data) => api.post('/auth/register', data),
    updateUser: (id, data) => api.put(`/users/${id}`, data),
    deleteUser: (id) => api.delete(`/users/${id}`),
    resetPassword: (userId, password) => api.post(`/users/${userId}/reset-password`, { password }),
    getDeviceModels: () => api.get('/admin/device-models'),
    createDeviceModel: (data) => api.post('/admin/device-models', data),
    deleteDeviceModel: (id) => api.delete(`/admin/device-models/${id}`),
    getRooms: () => api.get('/admin/rooms'),
    createRoom: (data) => api.post('/admin/rooms', data),
    deleteRoom: (id) => api.delete(`/admin/rooms/${id}`),
    getLogs: () => api.get('/admin/logs'),
    getSettings: () => api.get('/settings'),
    updateSettings: (data) => api.post('/settings', data),
    uploadLogo: (formData) => api.post('/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    deleteLogo: () => api.delete('/settings/logo'),
    toggleUserActive: (userId) => api.post(`/users/${userId}/toggle-active`),
    addUserPermission: (userId, permission) => api.post(`/users/${userId}/permissions`, { permission }),
    removeUserPermission: (userId, permission) => api.delete(`/users/${userId}/permissions/${permission}`),
    
    // Batch Imports
    batchCreateModels: (models) => api.post('/admin/device-models/batch', { models }),
    batchCreateRooms: (rooms) => api.post('/admin/rooms/batch', { rooms })
};

// Update Assets & Containers to include batch
assetsAPI.batchCreate = (assets) => api.post('/assets/batch', { assets });
containersAPI.batchCreate = (containers) => api.post('/containers/batch', { containers });

// Network API
export const networkAPI = {
    getDevices: () => api.get('/network/devices'),
    getVlans: () => api.get('/network/vlans'),
    saveVlan: (data) => api.post('/network/vlans', data),
    deleteVlan: (id) => api.delete(`/network/vlans/${id}`),
    assignDevice: (data) => api.post('/network/assign', data)
};

// Accessories API
export const accessoriesAPI = {
    getAccessories: () => api.get('/accessories'),
    getCategories: () => api.get('/accessories/categories'),
    createAccessory: (data) => api.post('/accessories', data),
    updateAccessory: (id, data) => api.put(`/accessories/${id}`, data),
    deleteAccessory: (id) => api.delete(`/accessories/${id}`)
};

// Help API
export const helpAPI = {
    getAllModules: () => api.get('/help'),
    getModule: (moduleName) => api.get(`/help/${moduleName}`),
    createEntry: (data) => api.post('/help', data),
    updateEntry: (id, data) => api.put(`/help/${id}`, data),
    deleteEntry: (id) => api.delete(`/help/${id}`)
};

export default api;
