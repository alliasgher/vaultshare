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
} from '@heroicons/react/24/outline';
import { formatFileSize, formatRelativeTime, copyToClipboard, getTimeRemaining } from '@/lib/utils';
import type { FileUpload } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return; // Wait for hydration
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadFiles();
  }, [isAuthenticated, router, hydrated]);

  const loadFiles = async () => {
    try {
      const data = await filesAPI.list();
      setFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load files:', error);
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
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
