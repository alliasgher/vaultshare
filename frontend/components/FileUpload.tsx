'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { filesAPI } from '@/lib/api';
import { CloudArrowUpIcon, LockClosedIcon, ClockIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatFileSize } from '@/lib/utils';
import type { FileUpload } from '@/types';

interface FileUploadComponentProps {
  onUploadSuccess?: (file: FileUpload) => void;
}

export default function FileUploadComponent({ onUploadSuccess }: FileUploadComponentProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [maxViews, setMaxViews] = useState(10);
  const [disableDownload, setDisableDownload] = useState(false);
  const [requireSignin, setRequireSignin] = useState(false);
  const [maxViewsPerConsumer, setMaxViewsPerConsumer] = useState(0);
  const [error, setError] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setSelectedFile(acceptedFiles[0]);
    setError('');
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setError('');
    setUploading(true);
    setUploadProgress(0);

    // Create abort controller for canceling upload
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const uploadedFile = await filesAPI.upload({
        file: selectedFile,
        password: password || undefined,
        expiry_hours: expiryHours,
        max_views: maxViews,
        disable_download: disableDownload,
        require_signin: requireSignin,
        max_views_per_consumer: maxViewsPerConsumer,
      });

      setUploadProgress(100);
      onUploadSuccess?.(uploadedFile);
      
      // Reset form
      setSelectedFile(null);
      setPassword('');
      setExpiryHours(24);
      setMaxViews(10);
      setDisableDownload(false);
      setRequireSignin(false);
      setMaxViewsPerConsumer(0);
    } catch (err: unknown) {
      // Check if upload was cancelled
      if ((err as Error).name === 'CanceledError' || (err as Error).name === 'AbortError') {
        setError('Upload cancelled');
        return;
      }

      const error = err as { response?: { data?: Record<string, unknown> } };
      // Try to get detailed error message
      const errorData = error?.response?.data;
      let errorMessage = 'Upload failed. Please try again.';
      
      if (errorData) {
        // Check for various error formats
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'object') {
          // Handle validation errors
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = String(firstError[0]);
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      }
      
      console.error('Upload error:', error);
      setError(errorMessage);
    } finally {
      setUploading(false);
      setAbortController(null);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setUploading(false);
      setUploadProgress(0);
      setAbortController(null);
      setError('Upload cancelled');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    disabled: uploading,
  });

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition
          ${isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400'
          }
          ${uploading || selectedFile ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} disabled={uploading || !!selectedFile} />
        <CloudArrowUpIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-lg text-blue-600">Drop the file here...</p>
        ) : (
          <>
            <p className="text-lg text-gray-700 mb-2">
              Drag & drop a file here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Maximum file size: 2GB
            </p>
          </>
        )}
      </div>

      {/* Selected File */}
      {selectedFile && !uploading && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
              <CloudArrowUpIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* Upload Options */}
      {selectedFile && !uploading && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <LockClosedIcon className="w-4 h-4 mr-2" />
                Password (optional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty for no password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <ClockIcon className="w-4 h-4 mr-2" />
                Expires in
              </label>
              <select
                value={expiryHours}
                onChange={(e) => setExpiryHours(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>7 days</option>
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <EyeIcon className="w-4 h-4 mr-2" />
                Max views
              </label>
              <select
                value={maxViews}
                onChange={(e) => setMaxViews(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>1 view</option>
                <option value={5}>5 views</option>
                <option value={10}>10 views</option>
                <option value={25}>25 views</option>
                <option value={50}>50 views</option>
                <option value={100}>100 views</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center">
              <input
                id="disable-download"
                type="checkbox"
                checked={disableDownload}
                onChange={(e) => setDisableDownload(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="disable-download" className="ml-2 block text-sm text-gray-700">
                Disable download (view only)
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="require-signin"
                type="checkbox"
                checked={requireSignin}
                onChange={(e) => setRequireSignin(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="require-signin" className="ml-2 block text-sm text-gray-700">
                Require sign-in to access (consumers must log in)
              </label>
            </div>

            {requireSignin && (
              <div className="ml-6 mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max views per consumer (0 = unlimited per user)
                </label>
                <select
                  value={maxViewsPerConsumer}
                  onChange={(e) => setMaxViewsPerConsumer(Number(e.target.value))}
                  className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={0}>Unlimited per consumer</option>
                  <option value={1}>1 view per consumer</option>
                  <option value={2}>2 views per consumer</option>
                  <option value={3}>3 views per consumer</option>
                  <option value={5}>5 views per consumer</option>
                  <option value={10}>10 views per consumer</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Each signed-in user can view the file up to this many times
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !uploading && (
        <button
          onClick={handleUpload}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
        >
          Upload File
        </button>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Uploading... {uploadProgress}%
            </p>
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
