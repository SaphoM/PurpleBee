import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse, PaginatedResponse } from '@/types/index';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API service wrapper
export const apiService = {
  // Generic request methods
  get: async <T,>(url: string) => {
    const response = await apiClient.get<ApiResponse<T>>(url);
    return response.data;
  },

  post: async <T,>(url: string, data: any) => {
    const response = await apiClient.post<ApiResponse<T>>(url, data);
    return response.data;
  },

  put: async <T,>(url: string, data: any) => {
    const response = await apiClient.put<ApiResponse<T>>(url, data);
    return response.data;
  },

  delete: async <T,>(url: string) => {
    const response = await apiClient.delete<ApiResponse<T>>(url);
    return response.data;
  },

  // Task endpoints
  tasks: {
    getAll: () => apiService.get('/tasks'),
    getById: (id: string) => apiService.get(`/tasks/${id}`),
    create: (data: any) => apiService.post('/tasks', data),
    update: (id: string, data: any) => apiService.put(`/tasks/${id}`, data),
    delete: (id: string) => apiService.delete(`/tasks/${id}`),
    getByStatus: (status: string) => apiService.get(`/tasks?status=${status}`),
  },

  // User endpoints
  user: {
    getProfile: () => apiService.get('/user/profile'),
    updateProfile: (data: any) => apiService.put('/user/profile', data),
    getSettings: () => apiService.get('/user/settings'),
    updateSettings: (data: any) => apiService.put('/user/settings', data),
  },

  // Team endpoints
  teams: {
    getAll: () => apiService.get('/teams'),
    getById: (id: string) => apiService.get(`/teams/${id}`),
    create: (data: any) => apiService.post('/teams', data),
    update: (id: string, data: any) => apiService.put(`/teams/${id}`, data),
    getMembers: (id: string) => apiService.get(`/teams/${id}/members`),
  },

  // Analytics endpoints
  analytics: {
    getMetrics: () => apiService.get('/analytics/metrics'),
    getTrends: (period: string) => apiService.get(`/analytics/trends?period=${period}`),
    getProductivity: () => apiService.get('/analytics/productivity'),
  },

  // Integration endpoints
  integrations: {
    getAll: () => apiService.get('/integrations'),
    getById: (id: string) => apiService.get(`/integrations/${id}`),
    create: (data: any) => apiService.post('/integrations', data),
    update: (id: string, data: any) => apiService.put(`/integrations/${id}`, data),
    delete: (id: string) => apiService.delete(`/integrations/${id}`),

    // WhatsApp specific
    whatsapp: {
      verify: (data: any) => apiService.post('/integrations/whatsapp/verify', data),
      sendMessage: (data: any) => apiService.post('/integrations/whatsapp/send', data),
      getStatus: () => apiService.get('/integrations/whatsapp/status'),
    },

    // Telegram specific
    telegram: {
      verify: (data: any) => apiService.post('/integrations/telegram/verify', data),
      sendMessage: (data: any) => apiService.post('/integrations/telegram/send', data),
      getStatus: () => apiService.get('/integrations/telegram/status'),
    },
  },

  // Notification endpoints
  notifications: {
    getAll: () => apiService.get('/notifications'),
    markAsRead: (id: string) => apiService.put(`/notifications/${id}`, { read: true }),
    delete: (id: string) => apiService.delete(`/notifications/${id}`),
  },

  // Authentication endpoints
  auth: {
    login: (email: string, password: string) =>
      apiService.post('/auth/login', { email, password }),
    logout: () => apiService.post('/auth/logout', {}),
    register: (data: any) => apiService.post('/auth/register', data),
    refreshToken: () => apiService.post('/auth/refresh', {}),
  },
};

export default apiClient;
