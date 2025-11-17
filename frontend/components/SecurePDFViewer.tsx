'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker - using unpkg CDN which is more reliable
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface SecurePDFViewerProps {
  url: string;
  filename: string;
}

export default function SecurePDFViewer({ url, filename }: SecurePDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
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
    <div className="flex flex-col h-full bg-gray-900">
      {/* Controls */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            ←
          </button>
          <span className="text-white text-sm">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            →
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
          >
            −
          </button>
          <span className="text-white text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(Math.min(2.0, scale + 0.1))}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
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
      <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4">
        <div 
          className="relative select-none"
          onContextMenu={(e) => { e.preventDefault(); return false; }}
          style={{ userSelect: 'none' }}
        >
          {/* Watermark Overlay */}
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

          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            className="select-none"
            loading={
              <div className="text-white text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                <p>Loading PDF...</p>
              </div>
            }
            error={
              <div className="text-red-400 text-center py-12">
                <p>Failed to load PDF</p>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              className="select-none"
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
