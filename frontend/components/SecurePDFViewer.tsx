'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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

  // Set worker once on mount
  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log('PDF loaded successfully:', { numPages, url });
    setNumPages(numPages);
    setError(null);
    setIsLoading(false);
  }

  function onDocumentLoadError(err: Error) {
    console.error('PDF load error:', err);
    console.error('PDF URL:', url);
    setError(err.message);
    setIsLoading(false);
  }

  const toggleFullscreen = async () => {
    const container = document.getElementById('pdf-fullscreen-container');
    if (!document.fullscreenElement && container) {
      await container.requestFullscreen().catch(console.error);
    } else if (document.fullscreenElement) {
      await document.exitFullscreen().catch(console.error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div id="pdf-fullscreen-container" className="flex flex-col h-full bg-gray-900">
      {/* Controls */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button onClick={() => setPageNumber(Math.max(1, pageNumber - 1))} disabled={pageNumber <= 1 || numPages === 0}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 text-sm">
            ←
          </button>
          <span className="text-white text-sm">
            {numPages > 0 ? `Page ${pageNumber} of ${numPages}` : 'Loading...'}
          </span>
          <button onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))} disabled={pageNumber >= numPages || numPages === 0}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 text-sm">
            →
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} disabled={numPages === 0}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 text-sm">−</button>
          <span className="text-white text-sm">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(Math.min(2.0, scale + 0.1))} disabled={numPages === 0}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 text-sm">+</button>
          <button onClick={toggleFullscreen} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm ml-2">
            {isFullscreen ? '✕ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-900">
        <div className="w-full h-full flex justify-center p-4">
          <div className="relative select-none" onContextMenu={(e) => e.preventDefault()} style={{ userSelect: 'none' }}>
            {!isLoading && !error && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center"
                style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(239,68,68,0.03) 100px, rgba(239,68,68,0.03) 200px)', zIndex: 10 }}>
                <div className="text-red-500 opacity-10 text-6xl font-black transform -rotate-45 select-none">
                  VIEW ONLY • NO DOWNLOAD
                </div>
              </div>
            )}

            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div className="text-white text-center py-12"><div className="animate-spin h-12 w-12 border-b-2 border-white mb-4"></div><p>Loading PDF...</p></div>}
              options={{
                cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                cMapPacked: true,
              }}
            >
              {numPages > 0 && (
                <Page key={`page_${pageNumber}`} pageNumber={pageNumber} scale={scale}
                  renderTextLayer={false} renderAnnotationLayer={false}
                  loading={<div className="text-white text-center py-8"><div className="animate-spin h-8 w-8 border-b-2 border-white"></div></div>} />
              )}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}
