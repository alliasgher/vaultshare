'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker - use jsdelivr CDN for reliability
pdfjs.GlobalWorkerOptions.workerSrc = `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SecurePDFViewerProps {
  url: string;
  filename: string;
}

export default function SecurePDFViewer({ url, filename }: SecurePDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadAttempts, setLoadAttempts] = useState<number>(0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log('PDF loaded successfully:', { numPages, url, attempts: loadAttempts + 1 });
    setNumPages(numPages);
    setError(null);
    setIsLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF load error (attempt', loadAttempts + 1, '):', error);
    console.error('PDF URL:', url);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Retry once if first attempt fails
    if (loadAttempts < 1) {
      console.log('Retrying PDF load...');
      setLoadAttempts(prev => prev + 1);
      setIsLoading(true);
      setError(null);
      // Force re-render by setting a timeout
      setTimeout(() => {
        setIsLoading(true);
      }, 100);
    } else {
      setError(error.message);
      setIsLoading(false);
    }
  }

  const toggleFullscreen = () => {
    const container = document.getElementById('pdf-fullscreen-container');
    if (!document.fullscreenElement && container) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div id="pdf-fullscreen-container" className="flex flex-col h-full bg-gray-900">
      {/* Controls */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1 || numPages === 0}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            ←
          </button>
          <span className="text-white text-sm">
            {numPages > 0 ? `Page ${pageNumber} of ${numPages}` : 'Loading...'}
          </span>
          <button
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages || numPages === 0}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            →
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
            disabled={numPages === 0}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            −
          </button>
          <span className="text-white text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(Math.min(2.0, scale + 0.1))}
            disabled={numPages === 0}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            +
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm ml-2"
          >
            {isFullscreen ? '✕ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-900">
        <div className="w-full h-full flex justify-center p-4">
          <div 
            className="relative select-none"
            onContextMenu={(e) => { e.preventDefault(); return false; }}
            style={{ userSelect: 'none' }}
          >
            {/* Watermark Overlay */}
            {!isLoading && !error && (
              <div 
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
                style={{ 
                  background: 'repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(239, 68, 68, 0.03) 100px, rgba(239, 68, 68, 0.03) 200px)',
                  zIndex: 10
                }}
              >
                <div className="text-red-500 opacity-10 text-6xl font-black transform -rotate-45 select-none">
                  VIEW ONLY • NO DOWNLOAD
                </div>
              </div>
            )}

            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              className="select-none"
              key={loadAttempts}
              options={{
                cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                cMapPacked: true,
                standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
              }}
              loading={
                <div className="text-white text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                  <p>Loading PDF...</p>
                  {loadAttempts > 0 && <p className="text-sm text-gray-400 mt-2">Retrying...</p>}
                </div>
              }
              error={
                <div className="text-red-400 text-center py-12">
                  <p className="font-semibold mb-2">Failed to load PDF</p>
                  {error && <p className="text-sm text-gray-400">{error}</p>}
                  <p className="text-xs text-gray-500 mt-2">Check browser console for details</p>
                </div>
              }
            >
              {!isLoading && !error && (
                <Page
                  key={`page_${pageNumber}`}
                  pageNumber={pageNumber}
                  scale={scale}
                  className="select-none"
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  width={undefined}
                  height={undefined}
                  loading={
                    <div className="text-white text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  }
                />
              )}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}
