/**
 * TypeScript types for VaultShare API
 */

export interface User {
  id: string;
  email: string;
  storage_used: number;
  storage_quota: number;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

export interface FileUpload {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_size_formatted: string;
  content_type: string;
  access_token: string;
  expiry_hours: number;
  expires_at: string;
  max_views: number;
  current_views: number;
  disable_download: boolean;
  access_url: string;
  created_at: string;
}

export interface FileUploadRequest {
  file: File;
  password?: string;
  expiry_hours?: number;
  max_views?: number;
  disable_download?: boolean;
}

export interface FileAccessRequest {
  access_token: string;
  password?: string;
}

export interface FileAccessResponse {
  success: boolean;
  file: {
    id: string;
    original_filename: string;
    file_size: number;
    file_size_formatted: string;
    content_type: string;
    expires_at: string;
    time_remaining: string;
    max_views: number;
    current_views: number;
    views_remaining: number;
    disable_download: boolean;
    created_at: string;
  };
  password_required: boolean;
}

export interface FileDownloadResponse {
  download_url?: string;
  view_url?: string;
  filename: string;
  content_type?: string;
  expires_in: number;
}

export interface AccessLog {
  id: string;
  ip_address: string;
  user_agent: string;
  access_granted: boolean;
  access_method: 'view' | 'download';
  failure_reason?: string;
  country?: string;
  city?: string;
  created_at: string;
}

export interface ApiError {
  error: string;
  detail?: string;
  password_required?: boolean;
}
