'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use CDN with exact version from installed pdfjs-dist package
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [pageReady, setPageReady] = useState<boolean>(false);
  const documentRef = useRef<any>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log('PDF loaded successfully:', { numPages, url });
    setNumPages(numPages);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error);
    console.error('PDF URL:', url);
    setError(error.message);
  }

  const toggleFullscreen = async () => {
    const container = document.getElementById('pdf-fullscreen-container');
    if (!document.fullscreenElement && container) {
      try {
        await container.requestFullscreen();
      } catch (err) {
        console.error('Fullscreen error:', err);
      }
    } else if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Exit fullscreen error:', err);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const wasFullscreen = isFullscreen;
      const nowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(nowFullscreen);
      
      // Reset scale when exiting fullscreen to prevent zoom issues
      if (wasFullscreen && !nowFullscreen) {
        setTimeout(() => setScale(1.0), 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

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
            {/* Watermark Overlay - only show when page is ready */}
            {pageReady && (
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

            {/* Only render Document when worker is ready */}
            <Document
              key={url} // Forces clean re-init on URL change
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              className="select-none"
              options={{
                cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                cMapPacked: true,
                disableAutoFetch: true, // Avoids range/partial fetch flakiness
                disableStream: true, // Prevents early teardown on slow servers
              }}
              loading={<Loader text="Loading PDF..." />}
              error={<Loader text="Loading PDF..." />}  // Hide default error banner
              noData={<Loader text="No PDF to display" />}
            >
              {numPages > 0 && (
                <Page
                  key={`page_${pageNumber}`}
                  pageNumber={pageNumber}
                  scale={scale}
                  className="select-none"
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderSuccess={() => setPageReady(true)}
                  onRenderError={() => setPageReady(false)} // Don't show default banner
                  loading={<Loader text="Rendering page..." />}
                  error={<Loader text="Rendering page..." />} // Hide per-page error too
                />
              )}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}

function Loader({ text }: { text: string }) {
  return (
    <div className="text-white text-center py-8">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
      <p>{text}</p>
    </div>
  );
}
