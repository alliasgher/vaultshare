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
  const [error, setError] = useState('');

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

    try {
      const uploadedFile = await filesAPI.upload({
        file: selectedFile,
        password: password || undefined,
        expiry_hours: expiryHours,
        max_views: maxViews,
        disable_download: disableDownload,
      });

      setUploadProgress(100);
      onUploadSuccess?.(uploadedFile);
      
      // Reset form
      setSelectedFile(null);
      setPassword('');
      setExpiryHours(24);
      setMaxViews(10);
      setDisableDownload(false);
    } catch (err: unknown) {
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
      setTimeout(() => setUploadProgress(0), 1000);
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
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 text-center">
            Uploading... {uploadProgress}%
          </p>
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
