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
    changePassword: (data) => api.put('/auth/change-password', data)
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
    return: (id) => api.put(`/lendings/${id}/return`)
};

// Errors API
export const errorsAPI = {
    getAll: (params) => api.get('/errors', { params }),
    getPublicInfo: (qrCode) => axios.get(`/api/errors/public/${qrCode}`),
    submitPublic: (formData) => axios.post('/api/errors/public', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    update: (id, data) => api.put(`/errors/${id}`, data)
};

// Dashboard API
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats')
};

export default api;
