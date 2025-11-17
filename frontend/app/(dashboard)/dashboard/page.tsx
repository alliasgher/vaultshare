'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { filesAPI } from '@/lib/api';
import FileUploadComponent from '@/components/FileUpload';
import {
  CloudArrowUpIcon,
  ArrowRightOnRectangleIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  CheckIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { formatFileSize, formatRelativeTime, copyToClipboard, getTimeRemaining } from '@/lib/utils';
import type { FileUpload, AccessLog } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return; // Wait for hydration
    
    // Verify tokens exist in localStorage (not just Zustand state)
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    
    // If Zustand thinks we're authenticated but tokens are missing, force logout
    if (isAuthenticated && (!accessToken || !refreshToken)) {
      console.error('Auth state mismatch - tokens missing, forcing logout');
      logout();
      return;
    }
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadFiles();
    
    // Auto-refresh file stats every 5 seconds (doesn't create access logs)
    const refreshInterval = setInterval(() => {
      loadFiles();
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, router, hydrated]);

  const loadFiles = async () => {
    try {
      const data = await filesAPI.list();
      setFiles(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load files:', error);
      // API interceptor will handle 401 and redirect automatically
      setFiles([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (file: FileUpload) => {
    setFiles([file, ...files]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await filesAPI.delete(id);
      setFiles(files.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Failed to delete file:', err);
      alert('Failed to delete file');
    }
  };

  const handleCopyLink = async (url: string, id: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleViewAnalytics = async (fileId: string) => {
    if (selectedFileId === fileId) {
      // Close analytics if already open
      setSelectedFileId(null);
      setAccessLogs([]);
      return;
    }

    setSelectedFileId(fileId);
    setLoadingLogs(true);
    
    try {
      const logs = await filesAPI.getAccessLogs(fileId);
      setAccessLogs(logs);
    } catch (err) {
      console.error('Failed to fetch access logs:', err);
      setAccessLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Show nothing while hydrating to prevent flash
  if (!hydrated || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <CloudArrowUpIcon className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">VaultShare</span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{user?.email}</span>
                <span className="ml-2">
                  {formatFileSize(user?.storage_used || 0)} / {formatFileSize(user?.storage_quota || 0)}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Upload Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Upload File</h2>
            <FileUploadComponent onUploadSuccess={handleUploadSuccess} />
          </div>

          {/* Files List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your Files</h2>
            {loading ? (
              <p className="text-gray-600 dark:text-gray-400">Loading files...</p>
            ) : files.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No files uploaded yet.</p>
            ) : (
              <div className="space-y-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {file.original_filename}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>{file.file_size_formatted}</span>
                          <span>•</span>
                          <span>
                            {file.current_views}/{file.max_views} views
                          </span>
                          <span>•</span>
                          <span>Expires in {getTimeRemaining(file.expires_at)}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(file.created_at)}</span>
                        </div>
                        <div className="mt-3 flex items-center space-x-2">
                          <input
                            type="text"
                            readOnly
                            value={file.access_url}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 dark:text-gray-300"
                          />
                          <button
                            onClick={() => handleCopyLink(file.access_url, file.id)}
                            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition"
                          >
                            {copiedId === file.id ? (
                              <>
                                <CheckIcon className="h-4 w-4 mr-1" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                                Copy Link
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={() => handleViewAnalytics(file.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition"
                          title="View Analytics"
                        >
                          <ChartBarIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
                          title="Delete File"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Access Analytics Section */}
          {selectedFileId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Analytics</h2>
                <button
                  onClick={() => {
                    setSelectedFileId(null);
                    setAccessLogs([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingLogs ? (
                <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
              ) : accessLogs.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No access attempts recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {accessLogs.filter(log => log.access_granted).length}
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-300">Successful</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {accessLogs.filter(log => !log.access_granted).length}
                      </div>
                      <div className="text-sm text-red-800 dark:text-red-300">Blocked</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {accessLogs.filter(log => log.access_method === 'download' && log.access_granted).length}
                      </div>
                      <div className="text-sm text-green-800 dark:text-green-300">Downloads</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {new Set(accessLogs.map(log => log.ip_address)).size}
                      </div>
                      <div className="text-sm text-purple-800 dark:text-purple-300">Unique IPs</div>
                    </div>
                  </div>

                  {/* Access Log Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left">Time</th>
                          <th className="px-4 py-3 text-left">Action</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">IP Address</th>
                          <th className="px-4 py-3 text-left">Location</th>
                          <th className="px-4 py-3 text-left">Device</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accessLogs.map((log) => {
                          // Parse user agent for better display
                          const ua = log.user_agent || '';
                          let browser = 'Unknown';
                          let os = 'Unknown';
                          
                          if (ua.includes('Chrome')) browser = 'Chrome';
                          else if (ua.includes('Firefox')) browser = 'Firefox';
                          else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
                          else if (ua.includes('Edge')) browser = 'Edge';
                          
                          if (ua.includes('Windows')) os = 'Windows';
                          else if (ua.includes('Mac')) os = 'macOS';
                          else if (ua.includes('Linux')) os = 'Linux';
                          else if (ua.includes('Android')) os = 'Android';
                          else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

                          // Determine action description
                          let actionText = '';
                          let actionColor = '';
                          
                          if (log.access_granted && log.access_method === 'view') {
                            actionText = '👁️ Viewed file';
                            actionColor = 'text-blue-700 dark:text-blue-300';
                          } else if (log.access_granted && log.access_method === 'download') {
                            actionText = '⬇️ Downloaded file';
                            actionColor = 'text-green-700 dark:text-green-300';
                          } else if (!log.access_granted) {
                            actionText = `🚫 Access denied`;
                            actionColor = 'text-red-700 dark:text-red-300';
                          } else {
                            actionText = '✓ Validated access';
                            actionColor = 'text-gray-700 dark:text-gray-300';
                          }

                          // Failure reason descriptions
                          const failureReasons: Record<string, string> = {
                            'deleted': 'File deleted',
                            'inactive': 'File inactive',
                            'expired': 'File expired',
                            'view_limit': 'View limit reached',
                            'wrong_password': 'Wrong password',
                          };

                          return (
                            <tr key={log.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                                <div className="font-medium">{formatRelativeTime(log.created_at)}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(log.created_at).toLocaleString()}
                                </div>
                              </td>
                              <td className={`px-4 py-3 font-medium ${actionColor}`}>
                                {actionText}
                              </td>
                              <td className="px-4 py-3">
                                {log.access_granted ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Success
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                    <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    {failureReasons[log.failure_reason || ''] || log.failure_reason || 'Blocked'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                                {log.ip_address || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {log.city && log.country ? (
                                  <div>
                                    <div>{log.city}</div>
                                    <div className="text-xs text-gray-500">{log.country}</div>
                                  </div>
                                ) : log.country || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                <div className="font-medium">{browser}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{os}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
