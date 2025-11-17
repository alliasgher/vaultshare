'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { publicAPI } from '@/lib/api';
import { CloudArrowUpIcon, LockClosedIcon, ArrowDownTrayIcon, EyeIcon } from '@heroicons/react/24/outline';
import { downloadFile } from '@/lib/utils';
import type { FileAccessResponse } from '@/types';

export default function FileAccessPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [password, setPassword] = useState('');
  const [fileData, setFileData] = useState<FileAccessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  // Enhanced screenshot protection and security
  useEffect(() => {
    const handleScreenshotAttempt = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      let screenshotDetected = false;
      
      // Mac screenshot shortcuts (Cmd+Shift+3/4/5)
      if (isMac && e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
        screenshotDetected = true;
      }
      
      // Windows/Linux print screen
      if (e.key === 'PrintScreen' || e.key === 'Print') {
        screenshotDetected = true;
      }
      
      if (screenshotDetected) {
        e.preventDefault();
        
        // Visual alert
        document.body.style.backgroundColor = '#ff0000';
        setTimeout(() => { document.body.style.backgroundColor = ''; }, 200);
        
        // Strong warning
        alert(
          '⚠️ SCREENSHOT ATTEMPT DETECTED ⚠️\n\n' +
          'Screenshots are STRICTLY PROHIBITED for this file.\n\n' +
          '• This attempt has been LOGGED\n' +
          '• The file owner has been NOTIFIED\n' +
          '• Your IP address has been recorded\n\n' +
          'Unauthorized distribution may result in legal action.'
        );
        
        // Log to backend (fire and forget)
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/access/log-screenshot/${token}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {});
      }
    };

    // Prevent right-click
    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
      alert('⚠️ Right-click is disabled to protect this content.');
      return false;
    };

    // Prevent text selection
    const preventSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Detect DevTools opening
    const detectDevTools = () => {
      const threshold = 160;
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        console.warn('DevTools detected');
        alert('⚠️ Developer tools detected.\n\nThis file is protected content.');
      }
    };

    // Monitor visibility changes (tab switching - potential screenshot)
    const handleVisibilityChange = () => {
      if (document.hidden && viewUrl) {
        console.warn('Tab switched - potential screenshot attempt');
      }
    };

    if (viewUrl) {
      document.addEventListener('keydown', handleScreenshotAttempt);
      document.addEventListener('contextmenu', preventRightClick);
      document.addEventListener('selectstart', preventSelection);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Check for DevTools periodically
      const devToolsInterval = setInterval(detectDevTools, 3000);

      return () => {
        document.removeEventListener('keydown', handleScreenshotAttempt);
        document.removeEventListener('contextmenu', preventRightClick);
        document.removeEventListener('selectstart', preventSelection);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(devToolsInterval);
      };
    }
  }, [viewUrl, token]);

  useEffect(() => {
    // Try to validate without password first
    const autoValidate = async () => {
      setError('');
      setLoading(true);

      try {
        const data = await publicAPI.validate({
          access_token: token,
          password: undefined,
        });
        setFileData(data);
        setNeedsPassword(false);
      } catch (err: unknown) {
        const response = (err as { response?: { data?: { error?: string; password_required?: boolean } } })?.response;
        const errorData = response?.data;
        
        if (errorData?.password_required) {
          setNeedsPassword(true);
        } else {
          setError(errorData?.error || 'Failed to access file. Please check your access token.');
        }
      } finally {
        setLoading(false);
      }
    };

    autoValidate();
  }, [token]);

  const handleValidate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await publicAPI.validate({
        access_token: token,
        password: password || undefined,
      });
      setFileData(data);
      setNeedsPassword(false);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { error?: string; password_required?: boolean } } })?.response;
      const errorData = response?.data;
      
      if (errorData?.password_required) {
        setNeedsPassword(true);
        setError('This file requires a password');
      } else {
        setError(errorData?.error || 'Failed to access file. Please check your access token.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!fileData) return;

    setDownloading(true);
    setError('');

    try {
      const data = await publicAPI.download({
        access_token: token,
        password: password || undefined,
      });
      
      if (data.download_url) {
        downloadFile(data.download_url, data.filename);
      }
      
      // Refresh file data to update download count
      setTimeout(async () => {
        try {
          const refreshedData = await publicAPI.validate({
            access_token: token,
            password: password || undefined,
          });
          setFileData(refreshedData);
        } catch (err) {
          console.error('Failed to refresh file data:', err);
        }
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(errorMessage || 'Failed to download file.');
    } finally {
      setDownloading(false);
    }
  };

  const handleView = async () => {
    if (!fileData) return;

    setViewing(true);
    setError('');

    try {
      const data = await publicAPI.view({
        access_token: token,
        password: password || undefined,
      });
      
      // Set the view URL to display inline
      setViewUrl(data.view_url || data.download_url || null);
      
      // Refresh file data to update view count
      setTimeout(async () => {
        try {
          const refreshedData = await publicAPI.validate({
            access_token: token,
            password: password || undefined,
          });
          setFileData(refreshedData);
        } catch (err) {
          console.error('Failed to refresh file data:', err);
        }
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(errorMessage || 'Failed to view file.');
    } finally {
      setViewing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Add global styles for screenshot protection */}
      <style jsx global>{`
        .no-screenshot {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
        }
      `}</style>
      
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="flex items-center space-x-2">
          <CloudArrowUpIcon className="w-8 h-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">VaultShare</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Access Shared File</h1>

            {needsPassword && !fileData ? (
              <form onSubmit={handleValidate} className="space-y-6">
                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <LockClosedIcon className="w-4 h-4 mr-2" />
                    Password Required
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to access this file"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Validating...' : 'Access File'}
                </button>
              </form>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading file...</p>
              </div>
            ) : error && !needsPassword ? (
              <div className="text-center py-12 space-y-4">
                <div className="rounded-md bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Go to Home
                </Link>
              </div>
            ) : fileData ? (
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    {fileData.file.original_filename}
                  </h2>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-500">File Size</dt>
                      <dd className="text-gray-900 font-medium">{fileData.file.file_size_formatted}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Content Type</dt>
                      <dd className="text-gray-900 font-medium">{fileData.file.content_type}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Views Remaining</dt>
                      <dd className="text-gray-900 font-medium">
                        {fileData.file.views_remaining} of {fileData.file.max_views}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Expires In</dt>
                      <dd className="text-gray-900 font-medium">{fileData.file.time_remaining}</dd>
                    </div>
                  </dl>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Inline File Viewer */}
                {viewUrl && (
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 relative no-screenshot select-none">
                    <div className="bg-red-100 border-b-2 border-red-300 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-red-800 flex items-center gap-2">
                          <LockClosedIcon className="h-5 w-5" />
                          🚫 PROTECTED CONTENT - Screenshots & Downloads Prohibited
                        </span>
                        <button
                          onClick={() => setViewUrl(null)}
                          className="text-sm text-red-700 hover:text-red-900 font-medium"
                        >
                          Close Preview
                        </button>
                      </div>
                      <p className="text-xs text-red-700 mt-1">
                        ⚠️ This file is monitored. All access attempts are logged.
                      </p>
                    </div>
                    
                    <div 
                      className="relative select-none" 
                      style={{ height: '600px' }}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                    >
                      {/* Global Watermark Overlay */}
                      <div 
                        className="absolute inset-0 pointer-events-none flex items-center justify-center"
                        style={{ 
                          background: 'repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(239, 68, 68, 0.02) 100px, rgba(239, 68, 68, 0.02) 200px)',
                          zIndex: 9999
                        }}
                      >
                        <div className="text-red-500 opacity-20 text-7xl font-black transform -rotate-45 select-none">
                          VIEW ONLY • NO SCREENSHOTS
                        </div>
                      </div>

                      {fileData.file.content_type.startsWith('image/') ? (
                        <div className="flex items-center justify-center h-full p-4 bg-gray-900 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={viewUrl} 
                            alt={fileData.file.original_filename}
                            className="max-w-full max-h-full object-contain select-none"
                            onContextMenu={(e) => e.preventDefault()}
                            onDragStart={(e) => e.preventDefault()}
                            style={{ 
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              msUserSelect: 'none',
                              pointerEvents: 'none',
                              WebkitTouchCallout: 'none'
                            }}
                          />
                          {/* Blocking overlay */}
                          <div className="absolute inset-0 select-none" style={{ zIndex: 10 }} />
                          {/* Corner watermarks */}
                          <div className="absolute top-4 left-4 text-red-500 opacity-40 font-bold text-xs select-none" style={{ zIndex: 11 }}>
                            PROTECTED
                          </div>
                          <div className="absolute top-4 right-4 text-red-500 opacity-40 font-bold text-xs select-none" style={{ zIndex: 11 }}>
                            NO COPY
                          </div>
                          <div className="absolute bottom-4 left-4 text-red-500 opacity-40 font-bold text-xs select-none" style={{ zIndex: 11 }}>
                            MONITORED
                          </div>
                          <div className="absolute bottom-4 right-4 text-red-500 opacity-40 font-bold text-xs select-none" style={{ zIndex: 11 }}>
                            VIEW ONLY
                          </div>
                        </div>
                      ) : fileData.file.content_type === 'application/pdf' ? (
                        <div className="w-full h-full relative">
                          <embed
                            src={viewUrl}
                            type="application/pdf"
                            className="w-full h-full select-none"
                            onError={() => console.error('Embed failed')}
                            style={{ 
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              pointerEvents: 'auto'
                            }}
                          />
                        </div>
                      ) : fileData.file.content_type.startsWith('text/') ? (
                        <div className="w-full h-full overflow-auto bg-white p-4 relative">
                          <iframe
                            src={viewUrl}
                            className="w-full h-full border-0"
                            title={fileData.file.original_filename}
                            sandbox="allow-same-origin"
                            style={{ 
                              pointerEvents: 'none',
                              userSelect: 'none'
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                            <p className="text-sm text-gray-500">{fileData.file.content_type}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleView}
                    disabled={viewing}
                    className="flex-1 flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <EyeIcon className="w-5 h-5 mr-2" />
                    {viewing ? 'Loading...' : viewUrl ? 'Refresh Preview' : 'View File'}
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    disabled={downloading || fileData.file.disable_download}
                    className="flex-1 flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={fileData.file.disable_download ? 'Download is disabled for this file' : ''}
                  >
                    <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                    {downloading ? 'Downloading...' : fileData.file.disable_download ? 'Download Disabled' : 'Download File'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
