/**
 * API client for VaultShare backend
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  User,
  LoginCredentials,
  RegisterData,
  AuthTokens,
  FileUpload,
  FileUploadRequest,
  FileAccessRequest,
  FileAccessResponse,
  FileDownloadResponse,
  AccessLog,
  ApiError,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Flag to prevent multiple simultaneous logout redirects
let isLoggingOut = false;

// Reset logout flag (called after successful login)
export const resetLogoutFlag = () => {
  isLoggingOut = false;
};

// Force logout and redirect
const forceLogout = () => {
  if (isLoggingOut) return;
  
  isLoggingOut = true;
  console.error('Force logout - clearing session and redirecting');
  
  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Immediate redirect - no setTimeout
  window.location.href = '/login';
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Don't intercept auth endpoints (login/register) - let them handle their own errors
    const isAuthEndpoint = originalRequest?.url?.includes('/users/login/') || 
                          originalRequest?.url?.includes('/users/register/') ||
                          originalRequest?.url?.includes('/auth/login/') ||
                          originalRequest?.url?.includes('/auth/register/') ||
                          originalRequest?.url?.includes('/token/refresh/');

    // If 401 and not already retrying, try to refresh token or logout
    if (error.response?.status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
      // If already logging out, don't process more errors
      if (isLoggingOut) {
        return Promise.reject(error);
      }

      const hadAccessToken = !!localStorage.getItem('access_token');
      
      // Only attempt refresh if user was actually logged in and not already retried
      if (hadAccessToken && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            throw new Error('No refresh token');
          }

          const { data } = await axios.post<{ access: string }>(`${API_URL}/users/token/refresh/`, {
            refresh: refreshToken,
          });

          localStorage.setItem('access_token', data.access);
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.access}`;
          }

          return api(originalRequest);
        } catch (refreshError) {
          // Session expired - force logout
          forceLogout();
          return Promise.reject(new Error('Session expired'));
        }
      } else if (hadAccessToken) {
        // Already retried and still 401 - force logout
        forceLogout();
        return Promise.reject(new Error('Session expired'));
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (data: RegisterData): Promise<AuthTokens> => {
    // Backend returns user data, not tokens on registration
    await api.post('/users/', data);
    // Login after successful registration
    resetLogoutFlag(); // Reset the flag on new login
    const loginResponse = await api.post<AuthTokens>('/auth/login/', {
      email: data.email,
      password: data.password,
    });
    return loginResponse.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    resetLogoutFlag(); // Reset the flag on new login
    const response = await api.post<AuthTokens>('/auth/login/', credentials);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/users/me/');
    return response.data;
  },

  refreshToken: async (refresh: string): Promise<{ access: string }> => {
    const response = await api.post<{ access: string }>('/auth/refresh/', { refresh });
    return response.data;
  },
};

// Files API
export const filesAPI = {
  upload: async (data: FileUploadRequest): Promise<FileUpload> => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.password) formData.append('password', data.password);
    if (data.expiry_hours) formData.append('expiry_hours', data.expiry_hours.toString());
    if (data.max_views) formData.append('max_views', data.max_views.toString());
    if (data.session_duration !== undefined) {
      formData.append('session_duration', data.session_duration.toString());
    }
    if (data.disable_download !== undefined) {
      formData.append('disable_download', data.disable_download.toString());
    }
    if (data.require_signin !== undefined) {
      formData.append('require_signin', data.require_signin.toString());
    }
    if (data.max_views_per_consumer !== undefined) {
      formData.append('max_views_per_consumer', data.max_views_per_consumer.toString());
    }

    const response = await api.post<FileUpload>('/files/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  list: async (): Promise<FileUpload[]> => {
    try {
      const response = await api.get<{ results: FileUpload[] } | FileUpload[]>('/files/');
      // Handle paginated response
      if (response.data && typeof response.data === 'object' && 'results' in response.data) {
        return Array.isArray(response.data.results) ? response.data.results : [];
      }
      // Handle direct array response
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  },

  get: async (id: string): Promise<FileUpload> => {
    const response = await api.get<FileUpload>(`/files/${id}/`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/files/${id}/`);
  },

  getAccessLogs: async (id: string): Promise<AccessLog[]> => {
    const response = await api.get<AccessLog[]>(`/files/${id}/access_logs/`);
    return response.data;
  },
};

// Public file access API (no auth required)
export const publicAPI = {
  validate: async (data: FileAccessRequest): Promise<FileAccessResponse> => {
    const response = await axios.post<FileAccessResponse>(
      `${API_URL}/access/validate/`,
      data
    );
    return response.data;
  },

  download: async (data: FileAccessRequest): Promise<FileDownloadResponse> => {
    const response = await axios.post<FileDownloadResponse>(
      `${API_URL}/access/download/`,
      data
    );
    return response.data;
  },

  view: async (data: FileAccessRequest): Promise<FileDownloadResponse> => {
    const response = await axios.post<FileDownloadResponse>(
      `${API_URL}/access/view/`,
      data
    );
    return response.data;
  },
};

export default api;
